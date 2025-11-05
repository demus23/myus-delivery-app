// pages/api/invoices/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type Item = {
  invoiceNo: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | string;
  description?: string;
  createdAt: string;
  method?: { type: "card" | "paypal" | "wire"; brand?: string; last4?: string; label?: string };
};

type ListResp = {
  ok: boolean;
  data: Item[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListResp | { ok: false; error: string }>) {
  const session = await getServerSession(req, res, authOptions as any);
  const userId = (session as any)?.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
  }

  await dbConnect();

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const statusStr = typeof req.query.status === "string" ? req.query.status.trim() : ""; // "succeeded,refunded"
  const statuses = statusStr ? statusStr.split(",").map(s => s.trim()).filter(Boolean) : [];

  const filter: any = { user: new mongoose.Types.ObjectId(userId) };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ invoiceNo: rx }, { description: rx }];
  }
  if (statuses.length) filter.status = { $in: statuses };

  const total = await Payment.countDocuments(filter);
  const docs = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data: Item[] = (docs || []).map((p: any) => ({
    invoiceNo: String(p.invoiceNo),
    amount: Number(p.amount ?? 0),
    currency: String(p.currency || "AED"),
    status: String(p.status),
    description: p.description || "",
    createdAt: new Date(p.createdAt ?? Date.now()).toISOString(),
    method: p.method
      ? {
          type: p.method.type,
          brand: p.method.brand,
          last4: p.method.last4,
          label: p.method.label,
        }
      : undefined,
  }));

  return res.status(200).json({
    ok: true,
    data,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}
