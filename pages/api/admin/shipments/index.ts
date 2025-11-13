// pages/api/admin/shipments/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

type AdminSession = { user?: { id?: string; role?: string } } | null;

function parseDate(d?: string) {
  if (!d) return undefined;
  // allow YYYY-MM-DD or ISO
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? undefined : dt;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ---- auth ----
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  const role = session?.user?.role || "";
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

    const {
      page: pageStr = "1",
      limit: limitStr = "20",
      q = "",
      status = "",
      from,
      to,
    } = req.query as Record<string, string | undefined>;

    const page = Math.max(parseInt(String(pageStr), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(limitStr), 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // ---- build filter ----
    const filter: any = {};

    // multiple statuses supported: ?status=delivered,in_transit
    if (status && status !== "all") {
      const statuses = status.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) filter.status = statuses[0];
      else if (statuses.length > 1) filter.status = { $in: statuses };
    }

    // date window (inclusive on "to")
    const fromDt = parseDate(from);
    const toDt = parseDate(to);
    if (fromDt || toDt) {
      filter.createdAt = {};
      if (fromDt) filter.createdAt.$gte = fromDt;
      if (toDt) {
        const end = new Date(toDt);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // search
    if (q && q.trim()) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      const or: any[] = [
        { trackingNumber: rx },
        { providerShipmentId: rx },
        { carrier: rx },
        { service: rx },
        { orderId: rx },
        { "to.name": rx },
        { "to.city": rx },
        { "from.name": rx },
        { "from.city": rx },
        { customerEmail: rx },
      ];
      if (mongoose.isValidObjectId(q)) {
        or.push({ _id: new mongoose.Types.ObjectId(q) });
      }
      filter.$or = or;
    }

    // ---- query ----
    const coll = db.collection("shipments");
    const projection = {
      _id: 1,
      providerShipmentId: 1,
      trackingNumber: 1,
      carrier: 1,
      service: 1,
      customerEmail: 1,
      currency: 1,
      status: 1,
      labelUrl: 1,
      orderId: 1,
      to: 1,
      from: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    // Prefer updatedAt desc for UI recency; your index {status, createdAt} also helps when status is filtered
    const sort = { updatedAt: -1 as const };

    const [items, total] = await Promise.all([
      coll.find(filter, { projection }).sort(sort).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      ok: true,
      data: {
        page,
        limit,
        total,
        totalPages,
        items,
      },
    });
  } catch (err: any) {
    console.error("[admin/shipments] error:", err);
    return res.status(500).json({ ok: false, error: "Server Error" });
  }
}
