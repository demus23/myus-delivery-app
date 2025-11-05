// pages/api/payments/paylink.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/mongoose"; // keep your original util
import Transaction from "@/lib/models/Transaction";
import User from "@/lib/models/User";
import Stripe from "stripe";
import mongoose from "mongoose";

// Important: omit apiVersion to avoid literal-type mismatch with your installed @types/stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

type Ok = { url: string; txId: string };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Loosen the type so TS doesn't think session is {}
    const sessionAny = (await getServerSession(req, res, authOptions as any)) as any;
    const sUser = sessionAny?.user as any;
    if (!sUser) return res.status(401).json({ error: "Unauthorized" });

    const {
      txId: rawTxId,
      amount,
      currency: rawCurrency = "AED",
      description = "Payment",
      forUserId,
      forEmail,
      invoiceNo, // optional
    } = (req.body as any) || {};

    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }
    const currency = String(rawCurrency || "AED").toLowerCase();

    await dbConnect();

    const isAdmin = ["admin", "superadmin"].includes(String(sUser?.role || "").toLowerCase());

    // Determine paying user
    let userId: string | undefined =
      sUser?.id || sUser?._id ? String(sUser.id || sUser._id) : undefined;

    if ((forUserId || forEmail) && isAdmin) {
      if (forUserId) {
        userId = String(forUserId);
      } else if (forEmail) {
        const u = (await User.findOne({ email: forEmail }, { _id: 1 }).lean()) as
          | { _id?: any }
          | null;
        if (u?._id) userId = String(u._id);
      }
    }

    if (!userId && sUser?.email) {
      const u = (await User.findOne({ email: sUser.email }, { _id: 1 }).lean()) as
        | { _id?: any }
        | null;
      if (u?._id) userId = String(u._id);
    }
    if (!userId) return res.status(400).json({ error: "Could not determine current user id" });

    // Reuse provided txId or create a new one
    const txId = rawTxId
      ? new mongoose.Types.ObjectId(String(rawTxId))
      : new mongoose.Types.ObjectId();

    // Build absolute URLs for redirects
    const proto = (req.headers["x-forwarded-proto"] as string) || "http";
    const host = req.headers.host || "localhost:3000";
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL ||
      `${proto}://${host}`;

    const success_url = `${base}/invoices?paid=1&tx=${txId.toString()}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${base}/invoices?canceled=1&tx=${txId.toString()}`;

    const cents = Math.round(amtNum * 100);

    // Create Checkout Session (no apiVersion specified to avoid TS literal mismatch)
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url,
        cancel_url,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: description || `Payment ${invoiceNo ? `for ${invoiceNo}` : ""}`.trim(),
              },
              unit_amount: cents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: {
            txId: txId.toString(),
            userId,
            invoiceNo: invoiceNo || "",
            source: "paylink",
          },
        },
        metadata: {
          txId: txId.toString(),
          userId,
          invoiceNo: invoiceNo || "",
          source: "paylink",
        },
      },
      { idempotencyKey: `paylink:${txId.toString()}` }
    );

    // Upsert transaction as pending
    await Transaction.updateOne(
      { _id: txId },
      {
        $set: {
          user: userId,
          amount: amtNum, // major units
          currency: currency.toUpperCase(),
          status: "pending",
          description,
          method: { type: "link" },
          processor: { name: "stripe", checkoutSessionId: checkout.id },
          invoiceNo: invoiceNo || undefined,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({ url: checkout.url!, txId: txId.toString() });
  } catch (err: any) {
    console.error("paylink error:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}
