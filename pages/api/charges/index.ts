// pages/api/charges/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { errorMessage } from "@/utils/errors";

type ChargeRow = {
  invoiceNo: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | string;
  description?: string;
  createdAt: string;
  method?: {
    type: "card" | "paypal" | "wire" | string;
    brand?: string;
    last4?: string;
    label?: string;
  };
};

type ListResp = {
  ok: true;
  data: ChargeRow[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

function parseIntSafe(v: any, def: number) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResp | { ok: false; error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions);
  // ✅ TS-safe access (your Session type may not declare user.id)
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthenticated" });

  try {
    await dbConnect();

    const page = parseIntSafe(req.query.page, 1);
    const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const statuses = statusRaw
      ? statusRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // ---- Filter ----
    const filter: any = { user: new mongoose.Types.ObjectId(userId) };

    if (q) {
      // Search invoiceNo or description
      filter.$or = [
        { invoiceNo: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (statuses.length) {
      filter.status = { $in: statuses };
    }

    const total = await Payment.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const docs = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const data: ChargeRow[] = (docs as any[]).map((p) => ({
      invoiceNo: String(p.invoiceNo),
      amount: Number(p.amount ?? 0),
      currency: String(p.currency ?? "AED"),
      status: String(p.status ?? "pending"),
      description: p.description ? String(p.description) : undefined,
      createdAt: new Date(p.createdAt ?? Date.now()).toISOString(),
      method: p.method
        ? {
            type: String(p.method.type ?? ""),
            brand: p.method.brand ? String(p.method.brand) : undefined,
            last4: p.method.last4 ? String(p.method.last4) : undefined,
            label: p.method.label ? String(p.method.label) : undefined,
          }
        : undefined,
    }));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, data, page, limit, total, pages });
  } catch (e: unknown) {
  console.error(e);
  return res.status(500).json({ ok: false, error: errorMessage(e) || "Server error" });
}
}
