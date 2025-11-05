import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Types } from "mongoose";
import { stripe } from "@/lib/stripe";

type Sess = { user?: { id?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Sess;
  const userId = session?.user?.id || (session as any)?.user?._id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthenticated" });

  await dbConnect();
  const db = mongoose.connection.db!;
  const users = db.collection("users");
  const u = await users.findOne(
    { _id: new Types.ObjectId(String(userId)) },
    { projection: { stripeCustomerId: 1, defaultStripePaymentMethodId: 1 } }
  ) as any;

  if (!u?.defaultStripePaymentMethodId) {
    return res.status(200).json({ ok: true, hasCardOnFile: false });
  }

  try {
    const pm = await stripe.paymentMethods.retrieve(u.defaultStripePaymentMethodId);
    const brand = (pm as any)?.card?.brand || null;
    const last4 = (pm as any)?.card?.last4 || null;
    return res.status(200).json({ ok: true, hasCardOnFile: true, brand, last4 });
  } catch {
    return res.status(200).json({ ok: true, hasCardOnFile: false });
  }
}
