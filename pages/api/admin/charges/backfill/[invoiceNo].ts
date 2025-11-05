import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { Types } from "mongoose";

/** Lean shape we expect from the payments collection */
type PaymentLean = {
  _id: Types.ObjectId;
  invoiceNo: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method?: { type?: string };
  /** optional Stripe fields we want to backfill */
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
};

function fail(res: NextApiResponse, code: number, msg: string) {
  return res.status(code).json({ ok: false, error: msg });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Method Not Allowed");
  }

  const session = await getServerSession(req, res, authOptions as any);
  const role = (session as any)?.user?.role || "";
  if (!(session as any)?.user?.id || !["admin", "superadmin"].includes(role)) {
    return fail(res, 403, "Forbidden");
  }

  await dbConnect();

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return fail(res, 400, "Missing invoiceNo");

  // ✅ Type the lean result so TS knows about our stripe* fields
  const inv = await Payment.findOne({ invoiceNo }).lean<PaymentLean>().exec();
  if (!inv) return fail(res, 404, "Invoice not found");

  // Already present?
  if (inv.stripePaymentIntentId) {
    return res
      .status(200)
      .json({ ok: true, already: true, paymentIntentId: inv.stripePaymentIntentId });
  }

  // 1) Try via stored Checkout Session
  if (inv.stripeCheckoutSessionId) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(inv.stripeCheckoutSessionId);
      const piId =
        typeof cs.payment_intent === "string"
          ? cs.payment_intent
          : (cs.payment_intent as Stripe.PaymentIntent | null)?.id;
      if (piId) {
        await Payment.updateOne({ invoiceNo }, { $set: { stripePaymentIntentId: piId } });
        return res.status(200).json({ ok: true, paymentIntentId: piId, source: "checkout.session" });
      }
    } catch {
      /* continue */
    }
  }

  // 2) Search PaymentIntents by metadata
  try {
    const r = await stripe.paymentIntents.search({
      query: `metadata['invoiceNo']:'${invoiceNo}'`,
      limit: 1,
    });
    const piId = r.data?.[0]?.id;
    if (piId) {
      await Payment.updateOne({ invoiceNo }, { $set: { stripePaymentIntentId: piId } });
      return res.status(200).json({ ok: true, paymentIntentId: piId, source: "pi.search" });
    }
  } catch {
    /* continue */
  }

  // 3) Search Charges by metadata → resolve PI
  try {
    const csearch = (await (stripe.charges as any).search({
      query: `metadata['invoiceNo']:'${invoiceNo}'`,
      limit: 1,
    })) as Stripe.ApiList<Stripe.Charge>;
    const charge = csearch?.data?.[0];
    const piId =
      typeof charge?.payment_intent === "string"
        ? charge.payment_intent
        : (charge?.payment_intent as Stripe.PaymentIntent | null)?.id;

    if (piId) {
      await Payment.updateOne({ invoiceNo }, { $set: { stripePaymentIntentId: piId } });
      return res.status(200).json({ ok: true, paymentIntentId: piId, source: "charge.search" });
    }
  } catch {
    /* continue */
  }

  return fail(res, 422, "Could not find a PaymentIntent for this invoice");
}
