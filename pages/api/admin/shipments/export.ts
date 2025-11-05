import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

function toCsvValue(v: any) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.id || !["admin", "superadmin"].includes(session.user?.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const { status, from, to, limit: limitStr = "2000" } = req.query as Record<string, string | undefined>;
  const limit = Math.min(Math.max(parseInt(String(limitStr), 10) || 2000, 1), 10000);

  const filter: any = {};
  if (status) {
    const arr = status.split(",").map(s => s.trim()).filter(Boolean);
    if (arr.length) filter.status = { $in: arr };
  }
  const created: any = {};
  if (from) created.$gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    created.$lte = d;
  }
  if (Object.keys(created).length) filter.createdAt = created;

  const projection = {
    shipmentId: 1, orderId: 1, trackingNumber: 1, status: 1,
    carrier: 1, service: 1, amount: 1, currency: 1,
    to: 1, from: 1, createdAt: 1, updatedAt: 1, labelUrl: 1,
  };

  const rows = await db.collection("shipments")
    .find(filter, { projection })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const headers = [
    "createdAt","shipmentId","orderId","trackingNumber","status",
    "carrier","service","amountMinor","currency","toName","toCity","toCountry","labelUrl"
  ];
  const lines = [headers.join(",")];

  for (const r of rows) {
    lines.push([
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      toCsvValue(r.shipmentId),
      toCsvValue(r.orderId),
      toCsvValue(r.trackingNumber),
      toCsvValue(r.status),
      toCsvValue(r.carrier),
      toCsvValue(r.service),
      String(r.amount ?? ""),
      toCsvValue(r.currency),
      toCsvValue(r.to?.name),
      toCsvValue(r.to?.city),
      toCsvValue(r.to?.country),
      toCsvValue(r.labelUrl),
    ].join(","));
  }

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="shipments_export.csv"`);
  return res.status(200).send(csv);
}
