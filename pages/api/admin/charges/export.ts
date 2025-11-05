import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import User from "@/lib/models/User";

function csvEscape(s: any) {
  const str = s == null ? "" : String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
const toMajor = (minor: number) => (Number(minor || 0) / 100);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin","superadmin"].includes(role)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  await dbConnect();

  // filters
  const q = String(req.query.q || "").trim();
  const statusParam = String(req.query.status || "").trim(); // e.g. "succeeded,refunded"
  const from = String(req.query.from || "");
  const to = String(req.query.to || "");
  const methodType = String(req.query.method || "");

  const find: any = {};
  if (q) {
    find.$or = [
      { invoiceNo: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
    if (mongoose.isValidObjectId(q)) find.$or.push({ _id: new mongoose.Types.ObjectId(q) });
  }
  if (statusParam) {
    find.status = { $in: statusParam.split(",").map(s => s.trim()).filter(Boolean) };
  }
  if (from) find.createdAt = { ...(find.createdAt || {}), $gte: new Date(from) };
  if (to)   find.createdAt = { ...(find.createdAt || {}), $lte: new Date(to + "T23:59:59Z") };
  if (methodType) find["method.type"] = methodType;

  const rows = await Payment.find(find).sort({ createdAt: 1 }).lean();
  const userIds = rows.map(r => r.user).filter(Boolean) as any[];
  const users = await User.find({ _id: { $in: userIds } }, { email: 1, name: 1 }).lean();
  const uMap = new Map(users.map(u => [String(u._id), u]));

  // header
  const out: string[] = [];
  out.push([
    "Date",
    "Invoice",
    "Customer Email",
    "Customer Name",
    "Description",
    "Method",
    "Status",
    "Currency",
    "Amount",
  ].join(","));

  // totals by currency
  const totals = new Map<string, number>(); // currency -> minor sum

  for (const r of rows) {
    const u = r.user ? uMap.get(String(r.user)) : undefined;
    const methodLabel =
      r.method?.type === "card" ? "Card" :
      r.method?.type === "paypal" ? "PayPal" :
      r.method?.type === "wire" ? "Wire" : "";

    const amountMajor = toMajor(Number(r.amount));
    const cur = r.currency || "AED";
    totals.set(cur, (totals.get(cur) || 0) + Number(r.amount || 0));

    out.push([
      csvEscape(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
      csvEscape(r.invoiceNo || String(r._id)),
      csvEscape(u?.email || ""),
      csvEscape(u?.name || ""),
      csvEscape(r.description || ""),
      csvEscape(methodLabel),
      csvEscape(r.status),
      csvEscape(cur),
      amountMajor.toFixed(2),
    ].join(","));
  }

  // blank line then totals
  out.push("");
  out.push("TOTALS (by currency)");
  // ✅ Use forEach to avoid Map iteration target issues
  totals.forEach((minor, cur) => {
    out.push([cur, toMajor(minor).toFixed(2)].join(","));
  });

  const body = out.join("\r\n");
  const fname = `accounting-export-${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
  res.status(200).send(body);
}
