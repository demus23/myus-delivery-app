import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

type PaymentLean = {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  invoiceNo: string;
  amount: number; // minor units
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  description?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
};

function baseUrlFromReq(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  if (!userId) return res.status(401).json({ ok: false, error: "Unauthenticated" });
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  // Make sure the invoice belongs to the signed-in user
  const inv = await Payment.findOne({
    invoiceNo,
    user: new mongoose.Types.ObjectId(userId),
  })
    .lean<PaymentLean>()
    .exec();

  if (!inv) return res.status(404).json({ ok: false, error: "Invoice not found" });
  if (inv.status === "succeeded" || inv.status === "refunded") {
    return res.status(409).json({ ok: false, error: "Invoice already paid/refunded" });
  }

  const appBase = baseUrlFromReq(req);

  // Reuse an existing open Checkout Session, if any
  if (inv.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
      // ✅ Checkout Session exposes `status`: 'open' | 'complete' | 'expired'
      if (existing?.url && existing.status === "open") {
        return res.status(200).json({ ok: true, url: existing.url });
      }
    } catch {
      // ignore — fall through to create a fresh session
    }
  }

  // Create a new Checkout Session
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: userEmail || undefined,
    metadata: { invoiceNo },
    payment_intent_data: { metadata: { invoiceNo } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: inv.currency.toLowerCase(),
          product_data: { name: `Invoice ${inv.invoiceNo}` },
          unit_amount: inv.amount,
        },
      },
    ],
    success_url: `${appBase}/charges?paid=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
    cancel_url: `${appBase}/charges?canceled=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
  };

  const cs = await stripe.checkout.sessions.create(params);

  await Payment.updateOne(
    { invoiceNo: inv.invoiceNo, user: inv.user },
    { $set: { stripeCheckoutSessionId: cs.id, status: "pending" } }
  );

  return res.status(200).json({ ok: true, url: cs.url });
}
