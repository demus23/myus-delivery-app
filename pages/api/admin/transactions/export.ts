import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { dbConnect } from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";
import User from "@/lib/models/User";

function parseDate(v?: string | string[]) {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(+d) ? null : d;
}
const csvEscape = (s: any) => {
  const v = s == null ? "" : String(s);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const me: any = session?.user;
  if (!me || !["admin", "superadmin"].includes(me.role)) {
    return res.status(401).send("Unauthorized");
  }

  await dbConnect();

  const {
    q = "",
    status = "all",
    method = "all",
    from,
    to,
    limit = "10000",
  } = req.query;

  const filter: any = {};
  if (status !== "all") filter.status = status;
  if (method !== "all") filter["method.type"] = method;

  const dFrom = parseDate(from);
  const dTo = parseDate(to);
  if (dFrom || dTo) {
    filter.createdAt = {};
    if (dFrom) filter.createdAt.$gte = dFrom;
    if (dTo) {
      const end = new Date(dTo);
      if (to && typeof to === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(to)) {
        end.setHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = end;
    }
  }

  const needle = String(q).trim();
  if (needle) {
    const rx = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { description: rx },
      { invoiceNumber: rx },
      { "method.type": rx },
      { "method.brand": rx },
      { status: rx },
    ];
  }

  const rows = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate("user", "email name")
    .lean();

  const header = [
    "id",
    "createdAt",
    "amount",
    "currency",
    "status",
    "method.type",
    "method.brand",
    "method.last4",
    "description",
    "customer",
    "customerEmail",
    "invoiceNo",
    "processor",
    "pi",
    "charge",
  ];

  let total = 0;
  const bodyLines = rows.map((r: any) => {
    total += Number(r.amount) || 0;
    return [
      r._id,
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      Number(r.amount) || 0,
      r.currency || "AED",
      r.status || "",
      r.method?.type || "",
      r.method?.brand || "",
      r.method?.last4 || "",
      r.description || "",
      r.user?.name || r.user?.email || "",
      r.user?.email || "",
      r.invoiceNumber || "",
      r.processor?.name || "",
      r.processor?.paymentIntentId || "",
      r.processor?.chargeId || "",
    ]
      .map(csvEscape)
      .join(",");
  });

  // Totals row
  const totalsRow = [
    "TOTALS",
    "",
    total,
    "AED",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]
    .map(csvEscape)
    .join(",");

  const csv = [header.join(","), ...bodyLines, totalsRow].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="charges_export.csv"`);
  return res.status(200).send(csv);
}
