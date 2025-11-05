import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import User from "@/lib/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin","superadmin"].includes(role)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  await dbConnect();

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const q = String(req.query.q || "").trim();
  const statusParam = String(req.query.status || "").trim();
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const methodType = String(req.query.method || "");

  const find: any = {};
  if (q) {
    find.$or = [
      { invoiceNo: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { _id: mongoose.isValidObjectId(q) ? new mongoose.Types.ObjectId(q) : undefined },
    ].filter(Boolean);
  }
  if (statusParam) {
    find.status = { $in: statusParam.split(",").map(s => s.trim()).filter(Boolean) };
  }
  if (from) find.createdAt = { ...(find.createdAt || {}), $gte: new Date(from) };
  if (to)   find.createdAt = { ...(find.createdAt || {}), $lte: new Date(to + "T23:59:59Z") };
  if (methodType) find["method.type"] = methodType;

  const total = await Payment.countDocuments(find);
  const rows  = await Payment.find(find)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const uIds = rows.map(r => r.user).filter(Boolean) as any[];
  const users = await User.find({ _id: { $in: uIds } }, { name:1, email:1 }).lean();
  const uMap = new Map(users.map(u => [String(u._id), u]));

  const data = rows.map(r => ({
    _id: String(r._id),
    invoiceNo: r.invoiceNo || String(r._id),
    amount: Number(r.amount),             // MINOR units
    currency: r.currency || "AED",
    status: r.status,
    method: r.method,
    description: r.description,
    createdAt: r.createdAt,
    userDoc: r.user ? { name: uMap.get(String(r.user))?.name, email: uMap.get(String(r.user))?.email } : undefined,
  }));

  res.status(200).json({ ok: true, data, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
}
