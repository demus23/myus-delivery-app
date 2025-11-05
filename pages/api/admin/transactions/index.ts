// pages/api/admin/transactions/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type AdminSession =
  | { user?: { id?: string; role?: string; email?: string } }
  | null;

const isAdmin = (s: AdminSession) =>
  s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();

  const q = String(req.query.q || "").trim();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const fromStr = typeof req.query.from === "string" ? req.query.from : "";
  const toStr = typeof req.query.to === "string" ? req.query.to : "";
  const method = typeof req.query.method === "string" ? req.query.method : "";
  const status = (String(req.query.status || "succeeded,refunded"))
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const filter: any = { status: { $in: status } };

  if (fromStr || toStr) {
    const created: any = {};
    if (fromStr) created.$gte = new Date(fromStr);
    if (toStr) created.$lte = new Date(toStr);
    filter.createdAt = created;
  }
  if (method) filter["method.type"] = method;

  // free text on invoiceNo or description or user email
  const ors: any[] = [];
  if (q) {
    ors.push({ invoiceNo: { $regex: q, $options: "i" } });
    ors.push({ description: { $regex: q, $options: "i" } });
  }
  if (ors.length) filter.$or = ors;

  // Join user doc manually
  const db = mongoose.connection.db!;
  const coll = db.collection<any>("payments");

  const cursor = coll.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $addFields: { userDoc: { $arrayElemAt: ["$userDoc", 0] } } },
    {
      $project: {
        _id: 0,
        invoiceNo: 1,
        amount: 1,
        currency: 1,
        status: 1,
        description: 1,
        method: 1,
        createdAt: 1,
        "userDoc.name": 1,
        "userDoc.email": 1,
      },
    },
  ]);

  const [data, totalAgg] = await Promise.all([
    cursor.toArray(),
    coll.countDocuments(filter),
  ]);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    data,
    page,
    limit,
    total: totalAgg,
    pages: Math.ceil(totalAgg / limit),
  });
}
