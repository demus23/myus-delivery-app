// pages/api/admin/charges/recent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    await dbConnect();

    const limitRaw = parseInt(String(req.query.limit ?? "10"), 10);
    const limit = Math.min(Math.max(1, isNaN(limitRaw) ? 10 : limitRaw), 50);

    const rows = await Payment.find(
      { status: { $in: ["succeeded", "refunded"] } },
      {
        invoiceNo: 1,
        amount: 1,
        currency: 1,
        status: 1,
        method: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ ok: true, data: rows || [] });
  } catch (err: any) {
    console.error("[charges/recent]", err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}
