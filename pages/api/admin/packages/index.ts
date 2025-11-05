// pages/api/admin/packages/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import UserModel, { type IUser } from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

type ApiErr = { error: string };

const isAdmin = (s: Session | null) =>
  ["admin", "superadmin"].includes(((s?.user as any)?.role || ""));

function normalizeStatus(input?: string) {
  if (!input) return "Pending";
  const v = String(input).trim().toLowerCase();
  // accept variations, store canonical values used by your model/UI
  if (v === "canceled") return "Cancelled";
  const map: Record<string, string> = {
    pending: "Pending",
    received: "Received",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    forwarded: "Forwarded",
    "in transit": "In Transit",
    transit: "In Transit",
  };
  return map[v] || "Pending";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | ApiErr>
) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!isAdmin(session)) return res.status(403).json({ error: "Forbidden" });

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ error: "Database not connected" });

  // ---------- GET: list with search/filters/pagination/sort ----------
  if (req.method === "GET") {
    const {
      search = "",
      status = "",
      suite = "",
      email = "",
      page = "1",
      limit = "20",
      sort = "-createdAt", // e.g. "-createdAt,tracking"
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit || "20", 10)));
    const skip = (pageNum - 1) * pageSize;

    const q: any = {};

    // fuzzy search across main fields
    if (search) {
      const s = search.trim();
      q.$or = [
        { tracking: { $regex: s, $options: "i" } },
        { courier: { $regex: s, $options: "i" } },
        { userEmail: { $regex: s, $options: "i" } },
        { suiteId: { $regex: s, $options: "i" } },
        { status: { $regex: s, $options: "i" } },
        { title: { $regex: s, $options: "i" } },
      ];
    }

    if (status) q.status = new RegExp("^" + normalizeStatus(status) + "$", "i");
    if (suite)  q.suiteId = new RegExp(suite, "i");
    if (email)  q.userEmail = new RegExp(email, "i");

    // sorting
    const sortObj: Record<string, 1 | -1> = {};
    for (const token of (sort || "").split(",")) {
      const key = token.trim();
      if (!key) continue;
      if (key.startsWith("-")) sortObj[key.slice(1)] = -1;
      else sortObj[key] = 1;
    }
    if (Object.keys(sortObj).length === 0) sortObj.createdAt = -1;

    const col = db.collection("packages");
    const [items, total] = await Promise.all([
      col.find(q).sort(sortObj).skip(skip).limit(pageSize).toArray(),
      col.countDocuments(q),
    ]);

    return res.status(200).json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / pageSize),
      pageSize,
    });
  }

  // ---------- POST: create with normalization & friendly errors ----------
  if (req.method === "POST") {
    try {
      const {
        tracking,
        courier,
        value,
        status = "Pending",
        userEmail,
        suiteId,
        title,
      } = req.body ?? {};

      // Validate essentials
      if (!tracking || !courier || value == null || isNaN(Number(value))) {
        return res
          .status(400)
          .json({ error: "tracking, courier, and numeric value are required" });
      }

      // Try to link to a user by email first, then by suiteId
      let user: IUser | null = null;
      if (typeof userEmail === "string" && userEmail.trim()) {
        user = await UserModel.findOne({
          email: userEmail.trim().toLowerCase(),
        })
          .lean<IUser | null>()
          .exec();
      }
      if (!user && typeof suiteId === "string" && suiteId.trim()) {
        user = await UserModel.findOne({ suiteId: suiteId.trim() })
          .lean<IUser | null>()
          .exec();
      }

      const now = new Date();

      // Normalize inputs
      const doc: any = {
        tracking: String(tracking).trim(),
        courier: String(courier).trim(),
        value: Number(value),
        status: normalizeStatus(status),
        title: typeof title === "string" && title.trim() ? title.trim() : undefined,

        // Prefer explicit body fields, fall back to matched user
        suiteId:
          typeof suiteId === "string" && suiteId.trim()
            ? suiteId.trim()
            : user?.suiteId,

        userEmail:
          typeof userEmail === "string" && userEmail.trim()
            ? userEmail.trim().toLowerCase()
            : user?.email,

        // Backward compatibility: keep both userId (legacy) and user (current)
        userId: user?._id,              // legacy field seen in your indexes
        user: user?._id,                // modern field used by your model

        createdAt: now,
        updatedAt: now,
        adminCreatedBy: (session?.user as any)?.email,
      };

      // Don’t store empty suiteId strings
      if (!doc.suiteId || String(doc.suiteId).trim() === "") delete doc.suiteId;

      const result = await db.collection("packages").insertOne(doc);

      // Best-effort log
      try {
        await ActivityLog.create({
          action: "add_package",
          entity: "package",
          entityId: result.insertedId?.toString() || "",
          performedBy: (session?.user as any)?.email,
          details: doc,
        });
      } catch {}

      return res.status(201).json({ ...doc, _id: result.insertedId });
    } catch (err: any) {
      if (err?.code === 11000) {
        // If some other unique index triggers
        return res.status(409).json({
          error: "Duplicate key",
          keyPattern: err.keyPattern,
          keyValue: err.keyValue,
        });
      }
      console.error("Admin create package failed:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
