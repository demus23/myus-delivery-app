import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import ShippingRate from "@/lib/models/ShippingRate";

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  await dbConnect();

  if (req.method === "GET") {
    const { lane } = req.query;
    const q: any = {};
    if (lane) q.lane = String(lane);
    const rates = await ShippingRate.find(q).sort({ lane: 1, carrier: 1, speed: 1 }).lean();
    return res.status(200).json({ ok: true, rates });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const required = [
      "lane","carrier","speed","minChargeKg","incrementStepKg","base",
      "perKgAfterMin","fuelPct","remoteFee","insurancePct","insuranceMin"
    ];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === "") {
        return res.status(400).json({ ok: false, error: `Missing ${k}` });
      }
    }

    const doc = await ShippingRate.findOneAndUpdate(
      { lane: body.lane, carrier: body.carrier, speed: body.speed },
      {
        $set: {
          lane: body.lane,
          carrier: body.carrier,
          speed: body.speed,
          minChargeKg: Number(body.minChargeKg),
          incrementStepKg: Number(body.incrementStepKg),
          base: Number(body.base),
          perKgAfterMin: Number(body.perKgAfterMin),
          fuelPct: Number(body.fuelPct),
          remoteFee: Number(body.remoteFee),
          insurancePct: Number(body.insurancePct),
          insuranceMin: Number(body.insuranceMin),
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({ ok: true, rate: doc });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
}
