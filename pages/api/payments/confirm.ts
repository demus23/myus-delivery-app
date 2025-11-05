// pages/api/payments/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { session_id, tx } = req.query as { session_id?: string; tx?: string };
    if (!session_id) return res.status(400).json({ ok: false, error: "session_id required" });

    await dbConnect();

    const sess = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "payment_intent.latest_charge", "payment_intent.payment_method"],
    });

    const paymentIntent = sess.payment_intent as Stripe.PaymentIntent | null;
    const charge = (paymentIntent?.latest_charge as any) as Stripe.Charge | undefined;

    const checkoutSessionId = sess.id;
    const paymentIntentId = paymentIntent?.id || null;
    const chargeId = charge?.id || null;

    const metaTx = (sess.metadata as any)?.txId || (paymentIntent?.metadata as any)?.txId || tx || null;

    let brand: string | null = null, last4: string | null = null;
    const pm = (paymentIntent?.payment_method as any) as Stripe.PaymentMethod | undefined;
    if (pm?.card) { brand = pm.card.brand || null; last4 = pm.card.last4 || null; }
    else if (charge?.payment_method_details?.card) {
      brand = charge.payment_method_details.card.brand || null;
      last4 = charge.payment_method_details.card.last4 || null;
    }

    // Update the row by txId, otherwise by PI/Session
    const query: any = metaTx ? { _id: metaTx } :
      paymentIntentId ? { "processor.paymentIntentId": paymentIntentId } :
      { "processor.checkoutSessionId": checkoutSessionId };

    await Transaction.updateOne(query, {
      $set: {
        status: "succeeded",
        "processor.name": "stripe",
        "processor.checkoutSessionId": checkoutSessionId,
        "processor.paymentIntentId": paymentIntentId,
        "processor.chargeId": chargeId,
        "method.type": "card",
        "method.brand": brand,
        "method.last4": last4,
      },
    }).exec();

    return res.json({ ok: true });
  
} catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string"
      ? (e as { message: string }).message
      : "confirm error";

  console.error("confirm failed:", e);
  return res.status(500).json({ ok: false, error: msg });
}
}