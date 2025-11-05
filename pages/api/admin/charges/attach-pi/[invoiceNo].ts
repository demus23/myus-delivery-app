import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import { Types } from "mongoose";

type PaymentLean = {
  _id: Types.ObjectId;
  invoiceNo: string;
  amount: number;           // minor units
  currency: string;         // e.g. "AED"
  status: "succeeded" | "pending" | "failed" | "refunded";
  stripePaymentIntentId?: string;
};

function fail(res: NextApiResponse, code: number, msg: string, more?: any) {
  return res.status(code).json({ ok: false, error: msg, ...more });
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
  const paymentIntentId = String(req.body?.paymentIntentId || "");
  if (!invoiceNo) return fail(res, 400, "Missing invoiceNo");
  if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
    return fail(res, 400, "Invalid paymentIntentId");
  }

  const inv = await Payment.findOne({ invoiceNo }).lean<PaymentLean>().exec();
  if (!inv) return fail(res, 404, "Invoice not found");

  // Retrieve PI and validate it matches this invoice (amount/currency)
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const piCurrency = (pi.currency || "").toUpperCase();
  const piAmount = typeof pi.amount === "number" ? pi.amount : (pi as any).amount_received || 0;

  if (piCurrency !== inv.currency.toUpperCase()) {
    return fail(res, 422, "Currency mismatch", { expected: inv.currency, actual: piCurrency });
  }

  // If inv succeeded but PI not succeeded yet, keep status as-is; otherwise sync to succeeded
  const set: Record<string, any> = { stripePaymentIntentId: paymentIntentId };
  if (pi.status === "succeeded" && inv.status !== "refunded") {
    set.status = "succeeded";
  }

  await Payment.updateOne({ invoiceNo }, { $set: set });

  return res.status(200).json({
    ok: true,
    invoiceNo,
    attached: paymentIntentId,
    piStatus: pi.status,
    amount: piAmount,
    currency: piCurrency,
  });
}
