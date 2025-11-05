import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";

// convert Stripe’s minor units to major if you need it elsewhere
const fromStripeAmount = (n?: number | null) => ((n ?? 0) / 100);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { invoiceNo, sessionId } = (req.body || {}) as { invoiceNo?: string; sessionId?: string };
  if (!invoiceNo && !sessionId) {
    return res.status(400).json({ ok: false, error: "Provide invoiceNo or sessionId" });
  }

  await dbConnect();

  // Find local payment
  const payment = await Payment.findOne(
    invoiceNo ? { invoiceNo } : { stripeCheckoutSessionId: sessionId }
  ).lean();

  if (!payment) {
    return res.status(404).json({ ok: false, error: "Payment not found" });
  }

  // Ensure we have the session id
  let sessId = payment.stripeCheckoutSessionId;
  if (!sessId && sessionId) sessId = sessionId;
  if (!sessId) {
    // try to search by invoiceNo in Stripe (metadata)
    // note: search API requires it to be enabled; otherwise skip
    return res.status(400).json({ ok: false, error: "Missing checkout session id" });
  }

  // Pull from Stripe
  const session = await stripe.checkout.sessions.retrieve(sessId);
  const piId = session.payment_intent as string | null;

  // If no PI yet, return current status
  if (!piId) {
    return res.status(200).json({ ok: true, data: { status: session.payment_status || "open" } });
  }

  const pi = await stripe.paymentIntents.retrieve(piId);

  // Optional: fetch charge for card details / receipt url
  let receiptUrl: string | undefined;
  let brand: string | undefined;
  let last4: string | undefined;
  if (pi.latest_charge) {
    const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
    const ch = await stripe.charges.retrieve(chargeId);
    receiptUrl = ch.receipt_url || undefined;
    const pmCard = ch.payment_method_details?.card;
    brand = pmCard?.brand || undefined;
    last4 = pmCard?.last4 || undefined;
  }

  const status = pi.status === "succeeded"
    ? "succeeded"
    : pi.status === "processing"
    ? "pending"
    : pi.status === "requires_payment_method"
    ? "failed"
    : "pending";

  await Payment.updateOne(
    { invoiceNo: payment.invoiceNo },
    {
      $set: {
        status,
        stripePaymentIntentId: pi.id,
        receiptUrl,
        method: { ...(payment as any).method, type: "card", brand, last4 },
        // if you store amount in MINOR units already, you may keep it;
        // otherwise you could sync: amount: pi.amount ?? payment.amount,
        currency: (pi.currency || payment.currency).toUpperCase(),
      },
      ...(payment.stripeCheckoutSessionId
        ? {}
        : { $setOnInsert: { stripeCheckoutSessionId: session.id } }),
    } as any
  ).exec();

  return res.status(200).json({ ok: true, data: { status } });
}
