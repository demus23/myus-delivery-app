import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Types } from "mongoose";
import { stripe } from "@/lib/stripe";

type Sess = { user?: { id?: string; email?: string; name?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Sess;
  const userId = session?.user?.id || (session as any)?.user?._id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthenticated" });

  await dbConnect();
  const db = mongoose.connection.db!;
  const users = db.collection("users");

  // Ensure Stripe Customer
  const u = await users.findOne({ _id: new Types.ObjectId(String(userId)) }) as any;
  let customerId: string | undefined = u?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u?.email || session?.user?.email || undefined,
      name: u?.name || session?.user?.name || undefined,
      metadata: { appUserId: String(userId) },
    });
    customerId = customer.id;
    await users.updateOne(
      { _id: new Types.ObjectId(String(userId)) },
      { $set: { stripeCustomerId: customerId } }
    );
  }

  // Create SetupIntent for off_session usage
  const si = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return res.status(200).json({ ok: true, clientSecret: si.client_secret });
}
