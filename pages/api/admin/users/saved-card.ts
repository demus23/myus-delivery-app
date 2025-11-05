// pages/api/admin/users/saved-card.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { stripe } from "@/lib/stripe";

type UserDoc = { _id: mongoose.Types.ObjectId; email: string; stripeCustomerId?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.id || !["admin", "superadmin"].includes(session?.user?.role)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const email = String(req.query.email || "");
  if (!email) return res.status(400).json({ ok: false, error: "email is required" });

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const user = await db.collection<UserDoc>("users").findOne({ email }, { projection: { stripeCustomerId: 1 } });
  if (!user?.stripeCustomerId) return res.status(200).json({ ok: true, hasCard: false });

  // Pull default card details (if any)
  const pms = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card" });
  const def = pms.data?.[0];
  return res.status(200).json({
    ok: true,
    hasCard: !!def,
    brand: def?.card?.brand || null,
    last4: def?.card?.last4 || null,
  });
}
