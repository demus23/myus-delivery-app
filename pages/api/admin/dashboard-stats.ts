// pages/api/admin/dashboard-stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import ActivityLog from "@/lib/models/ActivityLog";
import UserModel from "@/lib/models/User";

type Stats = {
  userCount: number;
  packageCount: number;
  deliveredCount: number;
  pendingCount: number;
  inTransitCount: number;
  problemCount: number;
  driverCount: number;
  transactions: Array<{ id: string; amount: number; method: string; status: string; date: string }>;
  activity: any[];
};

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "admin" || r === "superadmin";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Stats | { error: string }>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions as any);
  if (!isAdmin(session)) return res.status(403).json({ error: "Forbidden" });

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ error: "Database not connected" });

  try {
    const packages = db.collection("packages");

    const [userCount, packageCount, deliveredCount, pendingCount, inTransitCount, problemCount] =
      await Promise.all([
        UserModel.countDocuments(),
        packages.countDocuments({}),
        packages.countDocuments({ status: "delivered" }),
        packages.countDocuments({ status: "pending" }),
        packages.countDocuments({ status: "in_transit" }),
        packages.countDocuments({ status: "problem" }),
      ]);

    // If you have a drivers collection/role, compute real driverCount here.
    // For now assume drivers are users with role === 'driver'
    const driverCount = await UserModel.countDocuments({ role: "driver" }).catch(() => 0);

    // Latest 10 activities
    const activity = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    // You'll likely replace this with real payment/transaction data later.
    const transactions: Stats["transactions"] = [];

    return res.status(200).json({
      userCount,
      packageCount,
      deliveredCount,
      pendingCount,
      inTransitCount,
      problemCount,
      driverCount,
      transactions,
      activity,
    });
} catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "string"
      ? e
      : "Server error" ;

  return res.status(400).json({ error: msg });
}
}
  

