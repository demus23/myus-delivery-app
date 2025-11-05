import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { stripe } from "@/lib/stripe";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Types } from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { getErrorInfo } from "@/lib/errors";


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

  const { userId, amount, currency = "AED", description = "Shipment charge", invoiceNo } = req.body || {};
  const amountMinor = Math.round(Number(amount) * 100);
  if (!userId || !Number.isFinite(amountMinor) || amountMinor <= 0 || !invoiceNo) {
    return res.status(400).json({ ok: false, error: "userId, invoiceNo and positive amount are required" });
  }

  await dbConnect();
  const db = mongoose.connection.db!;
  const users = db.collection("users");

  const userDoc = await users.findOne(
    { _id: new Types.ObjectId(String(userId)) },
    { projection: { stripeCustomerId: 1, defaultStripePaymentMethodId: 1, email: 1 } }
  ) as any;

  if (!userDoc?.stripeCustomerId || !userDoc?.defaultStripePaymentMethodId) {
    return res.status(409).json({
      ok: false,
      error: "No card on file",
      next: "use_pay_link",
    });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: currency.toLowerCase(),
      customer: userDoc.stripeCustomerId,
      payment_method: userDoc.defaultStripePaymentMethodId,
      off_session: true,
      confirm: true,
      description,
      metadata: { invoiceNo, userId: String(userId) },
    });

    await Payment.updateOne(
      { invoiceNo },
      {
        $set: {
          status: pi.status === "succeeded" ? "succeeded" : "pending",
          stripePaymentIntentId: pi.id,
          method: { type: "card", brand: undefined, last4: undefined, label: "Card on file" },
        },
      }
    );

    if (pi.status === "succeeded") {
      return res.status(200).json({ ok: true, status: "succeeded", paymentIntentId: pi.id });
    } else if (pi.status === "requires_action") {
      // SCA needed: tell UI to fall back to link
      return res.status(409).json({
        ok: false,
        error: "Card requires authentication",
        next: "use_pay_link",
        paymentIntentId: pi.id,
      });
    }
    return res.status(202).json({ ok: true, status: pi.status, paymentIntentId: pi.id });
} catch (e: unknown) {
  const { message, code } = getErrorInfo(e); // <- no 'any'

  // Typical off_session error codes: authentication_required, card_declined, insufficient_funds…
  if (code === "authentication_required") {
    return res
      .status(409)
      .json({ ok: false, error: "Authentication required", next: "use_pay_link" });
  }

  return res.status(400).json({ ok: false, error: message || "Charge failed" });
}
}