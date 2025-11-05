// pages/api/admin/charges/paylink/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import { sendMail } from "@/lib/email/nodemailer";
import { logActivity } from "@/lib/activity";
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
};

function baseUrlFromReq(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  const inv = await Payment.findOne({ invoiceNo }).lean<PaymentLean>().exec();
  if (!inv) return res.status(404).json({ ok: false, error: "Invoice not found" });
  if (inv.status === "succeeded" || inv.status === "refunded") {
    return res.status(409).json({ ok: false, error: "Invoice already paid/refunded" });
  }

  // Find customer's email
  const db = mongoose.connection.db!;
  const userDoc = await db
    .collection<{ _id: mongoose.Types.ObjectId; email?: string; name?: string }>("users")
    .findOne({ _id: inv.user }, { projection: { email: 1, name: 1 } });

  const toEmail = userDoc?.email;
  const appBase = baseUrlFromReq(req);

  // Reuse existing open Checkout Session
  if (inv.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
      if (existing?.url && existing.status === "open") {
        await logActivity(req, {
          action: "paylink.reused",
          entity: "payment",
          entityId: inv.invoiceNo,
          performedById: session.user.id,
          performedByEmail: session.user.email,
          details: { checkoutSessionId: existing.id },
        });

        if (req.method === "POST" && toEmail) {
          await sendMail(
            toEmail,
            `Payment link for ${inv.invoiceNo}`,
            `<p>Hello${userDoc?.name ? " " + userDoc.name : ""},</p>
             <p>Please complete payment for <strong>${inv.invoiceNo}</strong>.</p>
             <p><a href="${existing.url}">Pay now</a></p>`
          );

          await logActivity(req, {
            action: "email.sent",
            entity: "payment",
            entityId: inv.invoiceNo,
            performedById: session.user.id,
            performedByEmail: session.user.email,
            details: { to: toEmail, template: "pay-now" },
          });
        }
        return res.status(200).json({ ok: true, url: existing.url });
      }
    } catch {
      // ignore and create a new session
    }
  }

  // Create a new Checkout Session
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: toEmail,
    metadata: { invoiceNo },
    payment_intent_data: { metadata: { invoiceNo } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: inv.currency.toLowerCase(),
          product_data: { name: inv.description ? inv.description : `Invoice ${inv.invoiceNo}` },
          unit_amount: inv.amount,
        },
      },
    ],
    success_url: `${appBase}/admin/charges?paid=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
    cancel_url: `${appBase}/admin/charges?canceled=1&inv=${encodeURIComponent(inv.invoiceNo)}`,
  };

  const cs = await stripe.checkout.sessions.create(params);

  await Payment.updateOne(
    { invoiceNo: inv.invoiceNo },
    { $set: { stripeCheckoutSessionId: cs.id, status: "pending" } }
  );

  await logActivity(req, {
    action: "paylink.created",
    entity: "payment",
    entityId: inv.invoiceNo,
    performedById: session.user.id,
    performedByEmail: session.user.email,
    details: { checkoutSessionId: cs.id },
  });

  if (req.method === "POST" && toEmail && cs.url) {
    await sendMail(
      toEmail,
      `Payment link for ${inv.invoiceNo}`,
      `<p>Hello${userDoc?.name ? " " + userDoc.name : ""},</p>
       <p>Please complete payment for <strong>${inv.invoiceNo}</strong>.</p>
       <p><a href="${cs.url}">Pay now</a></p>`
    );

    await logActivity(req, {
      action: "email.sent",
      entity: "payment",
      entityId: inv.invoiceNo,
      performedById: session.user.id,
      performedByEmail: session.user.email,
      details: { to: toEmail, template: "pay-now" },
    });
  }

  return res.status(200).json({ ok: true, url: cs.url });
}
