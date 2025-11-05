import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const sUser: any = session?.user;
  if (!sUser) return res.status(401).json({ ok: false, error: "Unauthorized" });

  await dbConnect();

  const userId = new mongoose.Types.ObjectId(String(sUser.id || sUser._id));
  const q = String(req.query.q || "").trim();

  const find: any = { user: userId };
  if (q) {
    find.$or = [
      { description: { $regex: q, $options: "i" } },
      { invoiceNo: { $regex: q, $options: "i" } },
      { _id: q },
      { status: { $regex: q, $options: "i" } },
      { "method.brand": { $regex: q, $options: "i" } },
    ];
  }

  const rows = await Transaction.find(find).sort({ createdAt: -1 }).lean();
  const data = rows.map(r => ({
    invoiceNo: r.invoiceNo || String(r._id),
    amount: Number(r.amount),
    currency: r.currency || "AED",
    status: r.status,
    method: r.method,
    description: r.description,
    createdAt: r.createdAt,
  }));

  return res.status(200).json({ ok: true, data });
}
