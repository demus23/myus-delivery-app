// pages/api/admin/track.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "admin" || r === "superadmin";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions as any);
  if (!isAdmin(session)) return res.status(403).json({ error: "Forbidden" });

  const tracking = String(req.query.tracking || "").trim();
  if (!tracking) return res.status(400).json({ error: "tracking is required" });

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ error: "Database not connected" });

  try {
    const pkg = await db.collection("packages").findOne({ tracking });
    if (!pkg) return res.status(404).json({ error: "Not found" });

    // Basic mapping for a friendlier response in your dashboard
    const raw = String(pkg.status || "").toLowerCase();
    const friendly =
      raw === "delivered" ? "Delivered" :
      raw === "in_transit" ? "In Transit" :
      raw === "problem" ? "Problem" :
      "Pending";

    // location is optional in your UI; provide a simple hint
    const location =
      raw === "in_transit" ? "Arrivals" :
      raw === "delivered" ? "Delivered" :
      raw === "problem" ? "Hold" :
      "Processing";

    return res.status(200).json({
      tracking: pkg.tracking,
      status: friendly,
      location,
      courier: pkg.courier ?? "",
      suiteId: pkg.suiteId ?? "",
      createdAt: pkg.createdAt ?? null,
    });
 } catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "string"
      ? e
      : "Server error" ;

  return res.status(500).json({ error: msg });
}
 
  }

