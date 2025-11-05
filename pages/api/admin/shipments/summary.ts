// pages/api/admin/shipments/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

type AdminSession = { user?: { id?: string; role?: string } } | null;

// Keep status keys in sync with your model/provider
const STATUS_KEYS = ["label_purchased","in_transit","out_for_delivery","delivered","exception","canceled","pending"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!session?.user?.id || !["admin", "superadmin"].includes(session?.user?.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const shipments = db.collection("shipments");

  const [countsAgg, recent] = await Promise.all([
    shipments
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    shipments
      .find({}, { projection: { _id: 1, trackingNumber: 1, status: 1, carrier: 1, service: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  // Build map of counts and ensure all keys exist
  const counts: Record<string, number> = Object.fromEntries(STATUS_KEYS.map(k => [k, 0]));
  let total = 0;
  for (const row of countsAgg) {
    counts[row._id || "unknown"] = row.count;
    total += row.count;
  }

  // Delivered today (server local time)
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const deliveredToday = await shipments.countDocuments({
    status: "delivered",
    updatedAt: { $gte: startOfDay },
  });

  return res.status(200).json({
    ok: true,
    data: {
      totals: { total, ...counts, deliveredToday },
      recent: recent.map(r => ({
        id: String(r._id),
        trackingNumber: r.trackingNumber,
        status: r.status,
        carrier: r.carrier,
        service: r.service,
        createdAt: r.createdAt,
      })),
    },
  });
}
