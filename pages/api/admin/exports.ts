// pages/api/admin/charges/export.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";

type AdminSession =
  | { user?: { id?: string; role?: string; email?: string } }
  | null;

function fail(res: NextApiResponse, code: number, msg: string) {
  return res.status(code).json({ ok: false, error: msg });
}

function csvEscape(val: unknown): string {
  const s = (val ?? "").toString();
  // escape quotes and wrap if needed
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function moneyMajor(minor: number) {
  return (Number(minor || 0) / 100).toFixed(2);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return fail(res, 405, `Method ${req.method} Not Allowed`);
  }

  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  const role = session?.user?.role || "";
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return fail(res, 403, "Forbidden");
  }

  await dbConnect();

  // filters: from, to (YYYY-MM-DD), status, method, q (search invoiceNo/desc/email)
  const { from, to, status, method, q } = req.query;
  const match: any = {};

  if (status && typeof status === "string") match.status = status;
  if (method && typeof method === "string") match["method.type"] = method;

  if (from || to) {
    match.createdAt = {};
    if (from && typeof from === "string") {
      match.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to && typeof to === "string") {
      // end of day (exclusive)
      const end = new Date(`${to}T23:59:59.999Z`);
      match.createdAt.$lte = end;
    }
  }

  // aggregate with user lookup so we can include email/name
  const pipeline: any[] = [
    { $match: match },
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ];

  // simple search over invoiceNo/description/user.email
  if (q && typeof q === "string" && q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    pipeline.push({
      $match: {
        $or: [
          { invoiceNo: rx },
          { description: rx },
          { "user.email": rx },
        ],
      },
    });
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        createdAt: 1,
        invoiceNo: 1,
        amount: 1,
        currency: 1,
        description: 1,
        status: 1,
        method: 1,
        billingAddress: 1,
        userEmail: "$user.email",
        userName: "$user.name",
      },
    },
    { $sort: { createdAt: -1 } }
  );

  const docs = await Payment.aggregate(pipeline as any).exec();

  const header = [
    "Date",
    "Invoice No",
    "User Email",
    "User Name",
    "Billing Name",
    "Amount",
    "Currency",
    "Status",
    "Method",
    "Brand",
    "Last4",
    "Description",
  ];

  const lines = [header.map(csvEscape).join(",")];

  for (const d of docs) {
    lines.push(
      [
        new Date(d.createdAt).toISOString(),
        d.invoiceNo,
        d.userEmail || "",
        d.userName || "",
        d.billingAddress?.fullName || "",
        moneyMajor(d.amount),
        d.currency,
        d.status,
        d.method?.type || "",
        d.method?.brand || "",
        d.method?.last4 || "",
        d.description || "",
      ].map(csvEscape).join(",")
    );
  }

  const csv = lines.join("\n");
  const base = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="charges-${base}.csv"`);
  return res.status(200).send(csv);
}
