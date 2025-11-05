// pages/api/admin/transactions/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type AdminSession = { user?: { id?: string; role?: string } } | null;

const isAdmin = (s: AdminSession) =>
  s?.user?.role === "admin" || s?.user?.role === "superadmin";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfYear(d = new Date()) {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  const x = new Date();
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();
  const db = mongoose.connection.db!;
  const coll = db.collection<any>("payments");

  // Only count settled money (succeeded - refunds)
  const settledMatch = { status: { $in: ["succeeded", "refunded"] } };

  async function sumSince(since: Date) {
    const pipeline = [
      { $match: { ...settledMatch, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$currency",
          gross: { $sum: { $cond: [{ $eq: ["$status", "succeeded"] }, "$amount", 0] } },
          refunds: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] } },
          count: { $sum: 1 },
        },
      },
    ];
    const rows = await coll.aggregate(pipeline).toArray();
    return rows.map(r => ({
      currency: r._id,
      gross: r.gross || 0,
      refunds: r.refunds || 0,
      net: (r.gross || 0) - (r.refunds || 0),
      count: r.count || 0,
    }));
  }

  const [today, last7d, mtd, ytd] = await Promise.all([
    sumSince(startOfDay()),
    sumSince(daysAgo(7)),
    sumSince(startOfMonth()),
    sumSince(startOfYear()),
  ]);

  // Recent 10 payments (succeeded/refunded)
  const recent = await coll
    .aggregate([
      { $match: settledMatch },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
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
    ])
    .toArray();

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    data: { today, last7d, mtd, ytd, recent },
  });
}
