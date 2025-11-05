// pages/api/invoices.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

let InvoiceModel: mongoose.Model<any>;
try {
  // Use your existing model if present
  InvoiceModel = (mongoose.models.Invoice as any) || require("@/lib/models/Invoice").default;
} catch {
  // Fallback shape for dev; ok to remove if you already have a model
  const InvoiceSchema = new mongoose.Schema(
    {
      invoiceNo: { type: String, index: true },
      customerName: String,
      customerEmail: String,
      status: {
        type: String,
        enum: ["draft", "unpaid", "paid", "overdue", "void", "refunded"],
        default: "unpaid",
        index: true,
      },
      currency: { type: String, default: "USD" },
      amount: { type: Number, default: 0 },
      dueDate: Date,
      metadata: mongoose.Schema.Types.Mixed,
    },
    { timestamps: true, collection: "invoices" }
  );
  InvoiceModel = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
}

type ListOk = {
  ok: true;
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    _id: string;
    invoiceNo?: string;
    customerName?: string;
    customerEmail?: string;
    status: string;
    currency?: string;
    amount?: number;
    createdAt?: string;
    dueDate?: string | null;
  }>;
};
type ListErr = { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListOk | ListErr>) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20));
    const skip = (page - 1) * pageSize;

    const status = String(req.query.status ?? "").trim();
    const statusList = status ? status.split(",").map((s) => s.trim()).filter(Boolean) : [];

    const q = String(req.query.q ?? "").trim();
    const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
    const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;

    const sortRaw = String(req.query.sort ?? "-createdAt").trim();
    // e.g. "-createdAt" or "amount"
    const sort: Record<string, 1 | -1> = {};
    for (const token of sortRaw.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!token) continue;
      if (token.startsWith("-")) sort[token.slice(1)] = -1;
      else sort[token] = 1;
    }

    // Build Mongo filter
    const filter: any = {};
    if (statusList.length) filter.status = { $in: statusList };
    if (q) {
      filter.$or = [
        { invoiceNo: new RegExp(q, "i") },
        { customerName: new RegExp(q, "i") },
        { customerEmail: new RegExp(q, "i") },
      ];
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom && !isNaN(dateFrom.getTime())) filter.createdAt.$gte = dateFrom;
      if (dateTo && !isNaN(dateTo.getTime())) filter.createdAt.$lte = dateTo;
    }

    const [itemsRaw, total] = await Promise.all([
      InvoiceModel.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
      InvoiceModel.countDocuments(filter),
    ]);

    const items = (itemsRaw || []).map((d: any) => ({
      _id: String(d._id),
      invoiceNo: d.invoiceNo,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      status: d.status,
      currency: d.currency,
      amount: typeof d.amount === "number" ? d.amount : 0,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
      dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
    }));

    return res.status(200).json({ ok: true, page, pageSize, total, items });
 } catch (e: unknown) {
  
  if (e instanceof Error) {
    console.error("GET /api/invoices error:", e.stack ?? e.message);
  } else {
    console.error("GET /api/invoices error:", e);
  }

  return res.status(500).json({ ok: false, error: "Server error" });

  }
}
