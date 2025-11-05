import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";

type AdminSession = { user?: { id?: string; role?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!session?.user?.id || !["admin","superadmin"].includes(session.user?.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  await dbConnect();
  const limit = Math.min(Number(req.query.limit ?? 20), 100);
  const docs = await Shipment.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .select({ orderId: 1, trackingNumber: 1, status: 1, labelUrl: 1, createdAt: 1 })
    .lean();

  return res.status(200).json({ ok: true, data: docs });
}
