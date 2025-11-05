import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Types } from "mongoose";
import { stripe } from "@/lib/stripe";

type Sess = { user?: { id?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Sess;
  const userId = session?.user?.id || (session as any)?.user?._id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthenticated" });

  const { paymentMethodId } = req.body || {};
  if (!paymentMethodId) return res.status(400).json({ ok: false, error: "paymentMethodId required" });

  await dbConnect();
  const db = mongoose.connection.db!;
  const users = db.collection("users");
  const u = await users.findOne({ _id: new Types.ObjectId(String(userId)) }) as any;
  if (!u?.stripeCustomerId) return res.status(409).json({ ok: false, error: "No Stripe customer" });

  // Ensure PM is attached to customer
  await stripe.paymentMethods.attach(paymentMethodId, { customer: u.stripeCustomerId }).catch((e) => {
    // ignore "already attached" errors
    if (!/already been attached/i.test(String(e?.message || ""))) throw e;
  });

  // Set as default
  await stripe.customers.update(u.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Grab card meta to show in UI
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const brand = (pm as any)?.card?.brand;
  const last4 = (pm as any)?.card?.last4;

  await users.updateOne(
    { _id: new Types.ObjectId(String(userId)) },
    { $set: { defaultStripePaymentMethodId: paymentMethodId } }
  );

  return res.status(200).json({ ok: true, brand, last4 });
}
