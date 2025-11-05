import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

type AdminSession = { user?: { id?: string; role?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const {
    page: pageStr = "1",
    limit: limitStr = "20",
    q = "",
    status,
    from,
    to,
  } = req.query as Record<string, string | undefined>;

  const page = Math.max(parseInt(String(pageStr), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(limitStr), 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (status && status !== "all") filter.status = status;

  const created: any = {};
  if (from) created.$gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    created.$lte = d;
  }
  if (Object.keys(created).length) filter.createdAt = created;

  if (q && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { shipmentId: rx },
      { providerShipmentId: rx },
      { trackingNumber: rx },
      { carrier: rx },
      { service: rx },
      { orderId: rx },
      { "to.name": rx },
      { "to.city": rx },
      { "from.name": rx },
      { "from.city": rx },
    ];
  }

  const coll = db.collection("shipments");
  const projection = {
    _id: 1,
    shipmentId: 1,
    providerShipmentId: 1,
    trackingNumber: 1,
    carrier: 1,
    service: 1,
    amount: 1,
    currency: 1,
    status: 1,
    labelUrl: 1,
    orderId: 1,
    to: 1,
    from: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  const [items, total] = await Promise.all([
    coll.find(filter, { projection }).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    coll.countDocuments(filter),
  ]);

  return res.status(200).json({ ok: true, data: { page, limit, total, items } });
}
