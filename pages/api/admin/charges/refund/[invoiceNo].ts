import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { Activity } from "@/lib/models/Activity";
import { stripe } from "@/lib/stripe";
import { sendMail } from "@/lib/email/nodemailer";
import type Stripe from "stripe"; // 👈 ADD THIS
import { errorMessage } from "@/utils/errors";

type SessionUser = { id?: string; role?: string; email?: string } | undefined;

function fail(res: NextApiResponse, code: number, msg: string, details?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[admin/refund]", msg, details || "");
  }
  return res.status(code).json({ ok: false, error: msg });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Method Not Allowed");
  }

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const me: SessionUser = session?.user;
  if (!me?.id || !["admin", "superadmin"].includes(String(me.role))) {
    return fail(res, 403, "Forbidden");
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  const amountMajor = req.body?.amount ? Number(req.body.amount) : undefined; // optional partial refund

  try {
    await dbConnect();

    const pay = await Payment.findOne({ invoiceNo }).lean();
    if (!pay) return fail(res, 404, "Invoice not found");
    if (pay.status === "pending") return fail(res, 409, "Cannot refund a pending invoice");
    if (pay.status === "refunded") return fail(res, 409, "Invoice already refunded");

    // Prefer stored PI; else try to resolve from Checkout Session
    let paymentIntentId: string | undefined = pay.stripePaymentIntentId;
    if (!paymentIntentId && pay.stripeCheckoutSessionId) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(pay.stripeCheckoutSessionId);
        if (typeof cs.payment_intent === "string") paymentIntentId = cs.payment_intent;
      } catch {}
    }
    if (!paymentIntentId) return fail(res, 400, "Stripe PaymentIntent id missing on this invoice");

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata: { invoiceNo }, // 👈 helpful for webhooks
    };
    if (Number.isFinite(amountMajor) && amountMajor! > 0) {
      refundParams.amount = Math.round(amountMajor! * 100); // minor units
    }

    const refund = await stripe.refunds.create(refundParams);

    // Optimistic update (webhook will also reconcile if needed)
    const set: any = {
      status: refund.status === "succeeded" ? "refunded" : pay.status,
      stripeRefundId: refund.id,
      refundedAmount: refund.amount || pay.amount,
      refundedAt: new Date(),
    };
    await Payment.updateOne({ invoiceNo }, { $set: set });

    await Activity.create({
      action: "refund.created",
      entity: "payment",
      entityId: invoiceNo,
      performedBy: new mongoose.Types.ObjectId(String(me.id)),
      performedByEmail: me.email,
      details: {
        stripeRefundId: refund.id,
        stripePaymentIntentId: paymentIntentId,
        amount: refund.amount,
        currency: refund.currency,
        reason: req.body?.reason || "admin",
        status: refund.status,
      },
      ip: req.headers["x-forwarded-for"] as string,
      ua: req.headers["user-agent"],
    });

    // Best-effort email
    try {
      const db = mongoose.connection.db!;
      const user = await db
        .collection("users")
        .findOne({ _id: pay.user as mongoose.Types.ObjectId }, { projection: { email: 1, name: 1 } });
      if (user?.email) {
        await sendMail(
          user.email,
          `Refund issued for ${invoiceNo}`,
          `<p>Hello${user?.name ? " " + user.name : ""},</p>
           <p>We've issued a refund for invoice <strong>${invoiceNo}</strong>.</p>
           <p>Amount: <strong>${(set.refundedAmount / 100).toFixed(2)} ${pay.currency}</strong></p>
           <p>If you have any questions, reply to this email.</p>`
        );
      }
    } catch (e) {
      console.error("[refund email] error", e);
    }

    return res.status(200).json({ ok: true, data: { invoiceNo, status: set.status } });
 } catch (e: unknown) {
  return fail(res, 500, "Server error", errorMessage(e));
}

}
