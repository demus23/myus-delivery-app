// pages/api/admin/payments/paylink/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

type AdminSession = {
  user?: { id?: string; role?: string; email?: string };
} | null;

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

const isAdmin = (s: AdminSession) =>
  s?.user?.role === "admin" || s?.user?.role === "superadmin";

function appBase(req: NextApiRequest) {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = (await getServerSession(
    req,
    res,
    authOptions as any
  )) as AdminSession;

  if (!session || !isAdmin(session)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const invoiceNo = String(req.query.invoiceNo || "").trim();
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  // Load the invoice
  const inv = await Payment.findOne({ invoiceNo })
    .lean<PaymentLean>()
    .exec();

  if (!inv) return res.status(404).json({ ok: false, error: "Invoice not found" });
  if (inv.status === "succeeded" || inv.status === "refunded") {
    return res.status(409).json({ ok: false, error: "Invoice already paid/refunded" });
  }

  // Fetch user email (for Checkout prefill)
  const db = mongoose.connection.db!;
  const userDoc = await db
    .collection<{ _id: mongoose.Types.ObjectId; email?: string; name?: string }>("users")
    .findOne({ _id: inv.user }, { projection: { email: 1, name: 1 } });

  // Reuse existing open Checkout Session
  if (inv.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
      if (existing?.url && existing.status === "open") {
        if (req.method === "POST" && userDoc?.email) {
          // optional: email the link here if you want
        }
        return res.status(200).json({ ok: true, url: existing.url });
      }
    } catch {
      // fall through and create a new one
    }
  }

  const base = appBase(req);
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: userDoc?.email,
    metadata: { invoiceNo },
    payment_intent_data: { metadata: { invoiceNo } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: inv.currency.toLowerCase(),
          product_data: { name: inv.description || `Invoice ${inv.invoiceNo}` },
          unit_amount: inv.amount,
        },
      },
    ],
    success_url: `${base}/admin/charges?paid=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
    cancel_url: `${base}/admin/charges?canceled=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
  };

  const cs = await stripe.checkout.sessions.create(params);

  await Payment.updateOne(
    { invoiceNo: inv.invoiceNo },
    { $set: { stripeCheckoutSessionId: cs.id, status: "pending" } }
  );

  // If this was a POST, you could send an email with cs.url here

  return res.status(200).json({ ok: true, url: cs.url });
}
