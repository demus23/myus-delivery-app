import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import UserModel, { type IUser } from "@/lib/models/User";

type Stats = {
  total: number;
  pending: number;
  in_transit: number;
  delivered: number;
  problem: number;
  // Convenience aliases for your top cards:
  recentlyArrived: number; // map to pending + in_transit (adjust if you prefer)
  shipped: number;         // map to delivered
};

type ApiOk = { ok: true; stats: Stats };
type ApiErr = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session?.user?.email) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  await dbConnect();

  const emailLc = String(session.user.email).trim().toLowerCase();
  const user = await UserModel.findOne({ email: emailLc })
    .lean<IUser | null>()
    .exec();
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "Database not connected" });

  const or: Record<string, any>[] = [{ userEmail: emailLc }];
  if (user._id) or.push({ userId: user._id });
  if (user.suiteId) or.push({ suiteId: user.suiteId });

  const pipeline = [
    { $match: { $or: or } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ];

  const grouped = await db.collection("packages").aggregate(pipeline).toArray();

  const base: Stats = {
    total: 0,
    pending: 0,
    in_transit: 0,
    delivered: 0,
    problem: 0,
    recentlyArrived: 0,
    shipped: 0,
  };

  for (const g of grouped) {
    const s = String(g._id || "").toLowerCase();
    const c = Number(g.count || 0);
    if (s in base) (base as any)[s] += c;
    base.total += c;
  }

  // Card mappings (tweak to your labels/UI)
  base.recentlyArrived = base.pending + base.in_transit;
  base.shipped = base.delivered;

  return res.status(200).json({ ok: true, stats: base });
}
