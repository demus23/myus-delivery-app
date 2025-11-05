// pages/api/me/transactions.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type Sess = { user?: { id?: string; _id?: string; email?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Sess;
  const sUser: any = session?.user;
  if (!sUser) return res.status(401).json({ ok: false, error: "Unauthorized" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(sUser.id || sUser._id));
  const q = String(req.query.q || "").trim();

  const filter: any = { user: userId, status: { $in: ["succeeded", "refunded"] } };
  if (q) {
    filter.$or = [
      { invoiceNo: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  const docs = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const data = docs.map(d => ({
    invoiceNo: d.invoiceNo,
    amount: d.amount,
    currency: d.currency,
    status: d.status,
    method: d.method,
    description: d.description,
    createdAt: d.createdAt,
  }));

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, data });
}
