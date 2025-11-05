import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Activity } from "@/lib/models/Activity";
import { Payment } from "@/lib/models/Payment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const me = session?.user;
  if (!me?.id) return res.status(401).json({ ok: false, error: "Unauthorized" });

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(me.id));

  // find my invoices
  const myPays = await Payment.find({ user: userId }, { invoiceNo: 1 }).lean();
  const invs = (myPays || []).map((p: any) => p?.invoiceNo).filter(Boolean);
  if (!invs.length) return res.status(200).json({ ok: true, data: [] });

  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const filter = { entity: "payment", entityId: { $in: invs } };
  const total = await Activity.countDocuments(filter);
  const data = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .skip((p - 1) * l)
    .limit(l)
    .lean();

  res.status(200).json({ ok: true, data, page: p, limit: l, total, pages: Math.max(1, Math.ceil(total / l)) });
}
