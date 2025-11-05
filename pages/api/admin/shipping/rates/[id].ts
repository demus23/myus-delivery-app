import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import ShippingRate from "@/lib/models/ShippingRate";
import mongoose from "mongoose";

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";
const { ObjectId } = mongoose.Types;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  await dbConnect();

  if (req.method === "PUT") {
    const body = req.body || {};
    const updates: any = {};
    [
      "lane","carrier","speed","minChargeKg","incrementStepKg","base",
      "perKgAfterMin","fuelPct","remoteFee","insurancePct","insuranceMin"
    ].forEach((k) => {
      if (body[k] !== undefined) {
        updates[k] =
          typeof body[k] === "number" ? body[k] : isNaN(Number(body[k])) ? body[k] : Number(body[k]);
      }
    });

    const doc = await ShippingRate.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    return res.status(200).json({ ok: true, rate: doc });
  }

  if (req.method === "DELETE") {
    const r = await ShippingRate.findByIdAndDelete(id).lean();
    if (!r) return res.status(404).json({ ok: false, error: "Not found" });
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    const r = await ShippingRate.findById(id).lean();
    if (!r) return res.status(404).json({ ok: false, error: "Not found" });
    return res.status(200).json({ ok: true, rate: r });
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
}
