// pages/api/me/billing/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type Sess = { user?: { id?: string; _id?: string } } | null;

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
  const coll = mongoose.connection.db!.collection<any>("payments");

  const [settled, pendingCount] = await Promise.all([
    coll
      .aggregate([
        { $match: { user: userId, status: { $in: ["succeeded", "refunded"] } } },
        {
          $group: {
            _id: "$currency",
            gross: { $sum: { $cond: [{ $eq: ["$status", "succeeded"] }, "$amount", 0] } },
            refunds: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] } },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    coll.countDocuments({ user: userId, status: "pending" }),
  ]);

  const byCurrency = settled.map((r) => ({
    currency: r._id as string,
    gross: r.gross || 0,
    refunds: r.refunds || 0,
    net: (r.gross || 0) - (r.refunds || 0),
    count: r.count || 0,
  }));

  // latest 5
  const recent = await coll
    .aggregate([
      { $match: { user: userId, status: { $in: ["succeeded", "refunded"] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
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
        },
      },
    ])
    .toArray();

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true, data: { byCurrency, pendingCount, recent } });
}
