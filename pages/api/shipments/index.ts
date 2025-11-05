// pages/api/shipments/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/db";
import { Shipment } from "@/lib/models/Shipment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  await dbConnect();

  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
  const docs = await Shipment.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const items = docs.map((s: any) => ({
    id: String(s._id),
    createdAt: s.createdAt,
    status: s.status,
    from: s.from,
    to: s.to,
    weightKg: s.weightKg ?? null,
    dims: s.dims ?? null, // << dims, not dimsCm
    carrier: s.carrier ?? null,
    service: s.service ?? null, // << service
    etaDays: s.etaDays ?? null,
    priceAED: s.priceAED ?? null,
  }));

  return res.status(200).json({ ok: true, items });
}
