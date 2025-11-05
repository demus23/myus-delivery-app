// /pages/api/admin/accounting/export.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]"; // <-- correct relative path
import { dbConnect } from "@/lib/mongoose";
import Invoice from "@/lib/models/Invoice";

function csvEscape(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions as any);
  const userInSession = (session as any)?.user;
  if (!userInSession || userInSession.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  const { from, to, dateField = "createdAt", status = "Paid" } = req.query as Record<string, string>;

  const filters: any = {};
  if (status !== "all") filters.status = status; // "Paid" | "Unpaid"

  if (from || to) {
    const field = ["createdAt", "dueDate"].includes(dateField) ? dateField : "createdAt";
    filters[field] = {};
    if (from) filters[field].$gte = new Date(`${from}T00:00:00.000Z`);
    if (to) filters[field].$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const rows = await Invoice.find(filters).sort({ createdAt: 1 }).lean();

  const header = [
    "Invoice No",
    "Created",
    "Due",
    "Status",
    "Total",
    "Paid Amount",
    "Outstanding",
    "Notes",
  ];

  let sumTotal = 0;
  let sumPaid = 0;
  let sumOutstanding = 0;

  const lines: string[] = [];
  lines.push(header.map(csvEscape).join(","));

  for (const inv of rows) {
    const total = Number((inv as any).total || 0);
    const paidAmount = (inv as any).status === "Paid" ? total : 0;
    const outstanding = (inv as any).status === "Paid" ? 0 : total;

    sumTotal += total;
    sumPaid += paidAmount;
    sumOutstanding += outstanding;

    const line = [
      (inv as any).number,
      (inv as any).createdAt ? new Date((inv as any).createdAt).toISOString().slice(0, 10) : "",
      (inv as any).dueDate ? new Date((inv as any).dueDate).toISOString().slice(0, 10) : "",
      (inv as any).status || "",
      total.toFixed(2),
      paidAmount.toFixed(2),
      outstanding.toFixed(2),
      (inv as any).notes || "",
    ];
    lines.push(line.map(csvEscape).join(","));
  }

  const totals = [
    "TOTALS",
    "",
    "",
    "",
    sumTotal.toFixed(2),
    sumPaid.toFixed(2),
    sumOutstanding.toFixed(2),
    "",
  ];
  lines.push(totals.map(csvEscape).join(","));

  const csv = lines.join("\n");
  const filename = `accounting-export-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send("\ufeff" + csv); // BOM for Excel
}
