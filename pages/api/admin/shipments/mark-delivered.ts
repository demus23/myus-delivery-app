import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.id || !["admin","superadmin"].includes(session.user?.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }
  const { shipmentId, trackingNumber, status = "delivered" } = req.body || {};
  if (!shipmentId && !trackingNumber) {
    return res.status(400).json({ ok: false, error: "shipmentId or trackingNumber required" });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const filter: any = shipmentId
    ? { $or: [{ _id: new mongoose.Types.ObjectId(String(shipmentId)) }, { shipmentId: String(shipmentId) }] }
    : { trackingNumber: String(trackingNumber) };

  const result = await db.collection("shipments").updateOne(filter, {
    $set: { status: String(status), updatedAt: new Date() },
  });

  if (!result.matchedCount) return res.status(404).json({ ok: false, error: "Shipment not found" });
  return res.status(200).json({ ok: true });
}
