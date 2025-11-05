// pages/api/transactions.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type SessionUser = { id?: string; _id?: string; email?: string; sub?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as
    | { user?: SessionUser }
    | null;

  const sUser = session?.user;
  const rawId = sUser?.id || sUser?._id || sUser?.sub;
  if (!rawId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(rawId));

  const docs = await Payment.find(
    {
      user: userId,
      status: { $in: ["succeeded", "refunded"] },
    },
    {
      invoiceNo: 1,
      amount: 1,
      currency: 1,
      status: 1,
      createdAt: 1,
      description: 1,
    }
  )
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const transactions = docs.map((d) => ({
    id: d.invoiceNo,
    amount: d.amount,
    currency: d.currency,
    status: d.status,
    date: d.createdAt,
    description: d.description,
  }));

  return res.status(200).json({ transactions });
}
