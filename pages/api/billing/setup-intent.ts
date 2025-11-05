// pages/api/billing/setup-intent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { stripe } from "@/lib/stripe";

type SessionLite = { user?: { id?: string; email?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({ ok:false }); }

  const session = (await getServerSession(req, res, authOptions as any)) as SessionLite; // <-- add type
  if (!session?.user?.id) return res.status(401).json({ ok:false, error:"Unauthorized" });

  const { email } = (req.body || {}) as { email?: string };
  if (!email) return res.status(400).json({ ok:false, error:"email required" });

  await dbConnect();
  const db = mongoose.connection.db!;
  const users = db.collection("users");
  const user = (await users.findOne({ email })) as any;

  let customerId = user?.stripeCustomerId as string | undefined;
  if (!customerId) {
    const c = await stripe.customers.create({ email, name: user?.name || undefined });
    customerId = c.id;
    await users.updateOne({ _id: user?._id }, { $set: { stripeCustomerId: customerId } });
  }

  const si = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { app: "myus-delivery" },
  });

  return res.status(200).json({ ok:true, client_secret: si.client_secret });
}
