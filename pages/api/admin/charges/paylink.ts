import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { stripe, APP_ORIGIN } from "@/lib/stripe";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type AdminSession = { user?: { id?: string; role?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any) as AdminSession;
  const role = session?.user?.role || "";
  if (!session?.user?.id || !["admin","superadmin"].includes(role)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const { invoiceNo, amount, currency = "AED", description = "Shipment charge", email } = req.body || {};
  const amountMinor = Math.round(Number(amount) * 100);
  if (!invoiceNo || !Number.isFinite(amountMinor) || amountMinor <= 0) {
    return res.status(400).json({ ok: false, error: "invoiceNo and positive amount are required" });
  }

  await dbConnect();

  // Optional: ensure the payment exists and is pending
  const p = await Payment.findOne({ invoiceNo }).lean();
  if (!p) return res.status(404).json({ ok: false, error: "Payment not found" });

  const sessionObj = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email || undefined, // or use a Stripe customer id if you have one
    success_url: `${APP_ORIGIN}/account/invoices?paid=${encodeURIComponent(invoiceNo)}`,
    cancel_url: `${APP_ORIGIN}/account/invoices?cancel=${encodeURIComponent(invoiceNo)}`,
    allow_promotion_codes: false,
    metadata: { invoiceNo },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amountMinor,
          product_data: { name: description },
        },
      },
    ],
  });

  // Save the session id for reconciliation
  await Payment.updateOne(
    { invoiceNo },
    { $set: { stripeCheckoutSessionId: sessionObj.id, status: "pending" } }
  );

  return res.status(200).json({ ok: true, url: sessionObj.url });
}
