// pages/api/admin/charges/charge-saved-card.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { stripe, getOrigin } from "@/lib/stripe";
import { Payment } from "@/lib/models/Payment";

type UserDoc = {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  stripeCustomerId?: string;
};

function genInvoiceNo(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${yyyy}${mm}${dd}-${rand}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.id || !["admin", "superadmin"].includes(session?.user?.role)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const { userEmail, amount, currency = "AED", description = "Admin charge", payment_method } =
    (req.body || {}) as {
      userEmail?: string;
      amount?: number;
      currency?: string;
      description?: string;
      payment_method?: string; // optional: charge a specific saved PM
    };

  const amt = Number(amount);
  if (!userEmail || !amt || !Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ ok: false, error: "userEmail and positive amount required" });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  // Look up user & Stripe customer
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ email: String(userEmail) }, { projection: { email: 1, name: 1, stripeCustomerId: 1 } });

  if (!user) return res.status(404).json({ ok: false, error: "User not found" });
  if (!user.stripeCustomerId) {
    return res
      .status(409)
      .json({ ok: false, error: "User has no saved card. Ask them to add a card or pay once via Checkout." });
  }

  // Create a local Payment first (pending)
  const invoiceNo = genInvoiceNo();
  const amountMinor = Math.round(amt * 100);
  const curr = String(currency).toUpperCase();

  const payDoc = await Payment.create({
    invoiceNo,
    amount: amountMinor,
    currency: curr,
    description,
    status: "pending",
    method: { type: "card", label: "Saved card" },
    user: user._id,
    email: user.email,
    billingAddress: {
      // keep required fields aligned with your schema
      fullName: user.name || user.email,
      line1: "N/A",
      city: "N/A",
      country: "AE",
      postalCode: "00000",
    },
    createdAt: new Date(),
  });

  try {
    // Off-session immediate charge
    const pi = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: curr.toLowerCase(),
      customer: user.stripeCustomerId,
      payment_method, // optional; if omitted, Stripe uses customer's default PM
      confirm: true,
      off_session: true,
      automatic_payment_methods: { enabled: true },
      description,
      metadata: { invoiceNo, paymentId: String(payDoc._id) },
    });

    // Pull latest charge to capture brand/last4/receipt
    let receiptUrl: string | undefined;
    let brand: string | undefined;
    let last4: string | undefined;

    if (pi.latest_charge) {
      const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const ch = await stripe.charges.retrieve(chargeId);
      receiptUrl = ch.receipt_url || undefined;
      // replace these two lines (where you read from ch.payment_method_details)
brand = (ch.payment_method_details?.card?.brand ?? undefined) as string | undefined;
last4 = (ch.payment_method_details?.card?.last4 ?? undefined) as string | undefined;

    }

    const finalStatus =
      pi.status === "succeeded"
        ? "succeeded"
        : pi.status === "processing"
        ? "pending"
        : pi.status === "requires_payment_method"
        ? "failed"
        : "pending";

    await Payment.updateOne(
      { _id: payDoc._id },
      {
        $set: {
          status: finalStatus,
          stripePaymentIntentId: pi.id,
          receiptUrl,
          method: { ...(payDoc as any).method, type: "card", brand, last4 },
        },
      } as any
    ).exec();

    return res.status(200).json({
      ok: true,
      data: { invoiceNo, status: finalStatus, paymentIntentId: pi.id, receiptUrl },
    });
  } catch (err: any) {
    // If SCA is needed (or PM not chargeable off-session), fall back to Checkout
    const needsAction =
      err?.code === "authentication_required" ||
      err?.code === "payment_intent_authentication_failure" ||
      err?.raw?.payment_intent?.status === "requires_action";

    if (!needsAction) {
      await Payment.updateOne(
        { _id: payDoc._id },
        { $set: { status: "failed", failureMessage: err?.message || "Charge failed" } }
      );
      return res.status(402).json({ ok: false, error: err?.message || "Charge failed" });
    }

    const ORIGIN = getOrigin(req);
    const sessionObj = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      // Save card so off-session works next time
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: { invoiceNo, paymentId: String(payDoc._id) },
      },
      customer: user.stripeCustomerId,
      success_url: `${ORIGIN}/admin/charges?paid=1&inv=${encodeURIComponent(
        invoiceNo
      )}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ORIGIN}/admin/charges?canceled=1&inv=${encodeURIComponent(
        invoiceNo
      )}&session_id={CHECKOUT_SESSION_ID}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: curr.toLowerCase(),
            unit_amount: amountMinor,
            product_data: { name: `Invoice ${invoiceNo}` },
          },
        },
      ],
      metadata: { invoiceNo, paymentId: String(payDoc._id) },
    });

    await Payment.updateOne(
      { _id: payDoc._id },
      { $set: { status: "pending", stripeCheckoutSessionId: sessionObj.id } }
    );

    return res.status(200).json({
      ok: true,
      data: { invoiceNo, status: "pending", payUrl: (sessionObj as any).url },
    });
  }
}
