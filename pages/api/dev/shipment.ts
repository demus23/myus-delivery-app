import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id, tn } = req.query;

  const filter: any = {};
  if (typeof tn === "string") filter.trackingNumber = tn.trim();
  if (typeof id === "string" && mongoose.isValidObjectId(id)) filter._id = new mongoose.Types.ObjectId(id);

  const doc = await Shipment.findOne(filter).lean();
  if (!doc) return res.status(404).json({ ok: false, error: "Not found", filter });

  return res.status(200).json({ ok: true, data: { status: doc.status, trackingNumber: doc.trackingNumber, labelUrl: doc.labelUrl, _id: doc._id } });
}
