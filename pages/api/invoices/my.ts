// pages/api/invoices/my.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type Row = {
  invoiceNo: string;
  status: "draft" | "sent" | "paid" | "void";
  total: number;          // major units for display (we convert from minor)
  currency: string;
  method?: string | null;
  createdAt?: string;
  paidAt?: string;
};

type Ok = { invoices: Row[] };
type Err = { error: string };

function mapPayStatusToUi(s: string): Row["status"] {
  const t = String(s || "").toLowerCase();
  if (t === "succeeded") return "paid";
  if (t === "refunded" || t === "failed" || t === "canceled" || t === "cancelled") return "void";
  return "sent"; // pending / processing / requires_action …
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const userId = (session as any)?.user?.id || (session as any)?.user?._id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  // Optional filters (keep simple; your page doesn’t use them yet)
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));

  const filter: any = { user: new mongoose.Types.ObjectId(String(userId)) };

  const docs = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const rows: Row[] = (docs || []).map((p: any) => {
    const uiStatus = mapPayStatusToUi(p.status);
    return {
      invoiceNo: String(p.invoiceNo || p._id),
      status: uiStatus,
      total: Math.round(Number(p.amount || 0)) / 100, // Payment.amount is minor units → major for UI
      currency: String(p.currency || "AED").toUpperCase(),
      method:
        p?.method?.label ||
        (p?.method?.brand ? `${p.method.brand} ••••${p.method.last4 ?? ""}` : null) ||
        (p?.method?.type ?? null),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
      paidAt:
        uiStatus === "paid" && p.updatedAt
          ? new Date(p.updatedAt).toISOString()
          : undefined,
    };
  });

  return res.status(200).json({ invoices: rows });
}
