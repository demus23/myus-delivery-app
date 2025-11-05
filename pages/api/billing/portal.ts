// pages/api/billing/portal.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import User from "@/lib/models/User";
import { stripe } from "@/lib/stripe";

function originFromReq(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ✅ cast as any so TS stops complaining about .user
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const sUser = session?.user;
  const userId = sUser?.id || sUser?._id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  await dbConnect();
  const u = await User.findById(new mongoose.Types.ObjectId(String(userId)));
  if (!u) return res.status(404).json({ ok: false, error: "User not found" });

  if (!u.stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: u.email || undefined,
      name: u.name || undefined,
      metadata: { appUserId: String(u._id) },
    });
    u.stripeCustomerId = customer.id;
    await u.save();
  }

  const returnUrl = originFromReq(req) + "/account/invoices";
  const portal = await stripe.billingPortal.sessions.create({
    customer: u.stripeCustomerId!,
    return_url: returnUrl,
  });

  return res.status(200).json({ ok: true, url: portal.url });
}
