import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";
import mongoose from "mongoose";

type AdminSession =
  | { user?: { id?: string; role?: string; email?: string } }
  | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role || "")) {
  return res.status(403).json({ ok: false, error: "Forbidden" });
}


  await dbConnect();

  const { id, tn } = req.query;
  const filter: any = {};
  if (typeof tn === "string") filter.trackingNumber = tn.trim();
  if (typeof id === "string" && mongoose.isValidObjectId(id)) filter._id = new mongoose.Types.ObjectId(id);

  const doc = await Shipment.findOne(filter).lean();
  if (!doc) return res.status(404).json({ ok: false, error: "Not found", filter });

  return res.status(200).json({
    ok: true,
    data: {
      _id: doc._id,
      status: doc.status,
      trackingNumber: doc.trackingNumber,
      labelUrl: doc.labelUrl,
      providerShipmentId: doc.providerShipmentId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  });
}
