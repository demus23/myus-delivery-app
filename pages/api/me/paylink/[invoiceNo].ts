// pages/api/me/paylink/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe"; // ✅ add this

function originFromReq(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ✅ cast as any so TS accepts .user.id
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = session?.user?.id || session?.user?._id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  // Ensure invoice belongs to this user
  const inv = await Payment.findOne({
    invoiceNo,
    user: new mongoose.Types.ObjectId(String(userId)),
  }).lean();
  if (!inv) return res.status(404).json({ ok: false, error: "Invoice not found" });
  if (inv.status === "succeeded" || inv.status === "refunded") {
    return res.status(409).json({ ok: false, error: "Already paid" });
  }

  const db = mongoose.connection.db!;
  const userDoc = await db
    .collection("users")
    .findOne({ _id: new mongoose.Types.ObjectId(String(userId)) }, { projection: { email: 1, name: 1, stripeCustomerId: 1 } });

  const appBase = originFromReq(req);

  // Reuse open session
  if (inv.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
      if (existing?.url && existing.status === "open") {
        return res.status(200).json({ ok: true, url: existing.url });
      }
    } catch {
      // create new below
    }
  }

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    success_url: `${appBase}/account/invoices?paid=${encodeURIComponent(inv.invoiceNo)}`,
    cancel_url: `${appBase}/account/invoices?cancel=${encodeURIComponent(inv.invoiceNo)}`,
    metadata: { invoiceNo },
    payment_intent_data: { metadata: { invoiceNo } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: inv.currency.toLowerCase(),
          unit_amount: inv.amount,
          product_data: { name: inv.description || `Invoice ${inv.invoiceNo}` },
        },
      },
    ],
  };

  if (userDoc?.stripeCustomerId) {
    (params as any).customer = userDoc.stripeCustomerId;
  } else if (userDoc?.email) {
    params.customer_email = userDoc.email;
  }

  const cs = await stripe.checkout.sessions.create(params);
  await Payment.updateOne(
    { invoiceNo: inv.invoiceNo },
    { $set: { stripeCheckoutSessionId: cs.id, status: "pending" } }
  );

  return res.status(200).json({ ok: true, url: cs.url });
}
