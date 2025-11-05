// pages/api/admin/activity/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Activity } from "@/lib/models/Activity"; // <-- use Activity (collection: activities)
import { Types } from "mongoose";

type Item = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy?: string | null;
  performedByEmail?: string | null;
  details?: any;
  createdAt: string; // ISO
};

const isAdmin = (s: any) =>
  s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res
      .status(405)
      .json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    // --- parse filters ---
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const rawEntity = typeof req.query.entity === "string" ? req.query.entity.trim() : "";
    const normEntity = rawEntity.toLowerCase();
    const skipVals = new Set(["", "all", "any", "payment / package", "payment/package", "payment, package"]);
    const entity = skipVals.has(normEntity) ? "" : normEntity;

    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const limitRaw = parseInt(String(req.query.limit ?? "50"), 10);
    const pageRaw = parseInt(String(req.query.page ?? "1"), 10);
    const limit = Math.min(Math.max(1, Number.isNaN(limitRaw) ? 50 : limitRaw), 200);
    const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);

    const fromStr = typeof req.query.from === "string" ? req.query.from : undefined;
    const toStr = typeof req.query.to === "string" ? req.query.to : undefined;

    const from = fromStr ? new Date(fromStr) : null;
    const to = toStr ? new Date(toStr) : null;

    const filter: any = {};
    const ors: any[] = [];

    if (userId) {
      // logs about a user OR performed by the user
      ors.push({ entity: "user", entityId: userId });
      if (Types.ObjectId.isValid(userId)) {
        ors.push({ performedBy: new Types.ObjectId(userId) });
      } else {
        ors.push({ performedBy: userId });
      }
    }

    if (q) {
      ors.push(
        { action: { $regex: q, $options: "i" } },
        { entity: { $regex: q, $options: "i" } },
        { entityId: { $regex: q, $options: "i" } },
        { performedByEmail: { $regex: q, $options: "i" } }
      );
    }

    if (ors.length) filter.$or = ors;
    if (entity) filter.entity = entity;           // <-- only set when explicitly chosen
    if (action) filter.action = action;

    if (from || to) {
      const created: any = {};
      if (from && !isNaN(from.getTime())) created.$gte = from;
      if (to && !isNaN(to.getTime())) created.$lte = to;
      if (Object.keys(created).length) filter.createdAt = created;
    }

    const [docs, total] = await Promise.all([
      Activity.find(filter)              // <-- unified model
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    const items: Item[] = (docs || []).map((l: any) => ({
      id: String(l._id),
      action: String(l.action),
      entity: String(l.entity),
      entityId: l.entityId ? String(l.entityId) : undefined,
      performedBy: l.performedBy ? String(l.performedBy) : null,
      performedByEmail: l.performedByEmail ? String(l.performedByEmail) : null,
      details: l.details ?? undefined,
      createdAt: new Date(l.createdAt).toISOString(),
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      data: items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Server error" });
  }
}
