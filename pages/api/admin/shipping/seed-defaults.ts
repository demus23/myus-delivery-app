import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import ShippingRate from "@/lib/models/ShippingRate";

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

const DEFAULTS: any = {
  "UAE-UK": {
    DHL: { standard:[0.5,0.5,55,22,0.18,35,0.005,10], express:[0.5,0.5,70,28,0.20,35,0.005,10] },
    Aramex: { standard:[0.5,0.5,48,19,0.15,35,0.005,10], express:[0.5,0.5,60,24,0.18,35,0.005,10] },
    UPS: { standard:[0.5,0.5,52,20,0.17,35,0.005,10], express:[0.5,0.5,68,26,0.20,35,0.005,10] },
  },
  "UK-UAE": {
    DHL: { standard:[0.5,0.5,58,23,0.18,35,0.005,10], express:[0.5,0.5,74,29,0.20,35,0.005,10] },
    Aramex: { standard:[0.5,0.5,50,20,0.15,35,0.005,10], express:[0.5,0.5,62,25,0.18,35,0.005,10] },
    UPS: { standard:[0.5,0.5,54,21,0.17,35,0.005,10], express:[0.5,0.5,70,27,0.20,35,0.005,10] },
  },
  "UAE-USA": {
    DHL: { standard:[0.5,0.5,62,26,0.20,45,0.005,10], express:[0.5,0.5,80,32,0.22,45,0.005,10] },
    Aramex: { standard:[0.5,0.5,56,24,0.17,45,0.005,10], express:[0.5,0.5,72,29,0.20,45,0.005,10] },
    UPS: { standard:[0.5,0.5,60,25,0.19,45,0.005,10], express:[0.5,0.5,78,31,0.22,45,0.005,10] },
  },
  "USA-UAE": {
    DHL: { standard:[0.5,0.5,64,27,0.20,45,0.005,10], express:[0.5,0.5,82,33,0.22,45,0.005,10] },
    Aramex: { standard:[0.5,0.5,58,24,0.18,45,0.005,10], express:[0.5,0.5,74,30,0.20,45,0.005,10] },
    UPS: { standard:[0.5,0.5,62,26,0.19,45,0.005,10], express:[0.5,0.5,80,32,0.22,45,0.005,10] },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !isAdmin(session)) return res.status(403).json({ ok:false, error:"Forbidden" });
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:`Method ${req.method} Not Allowed` });

  await dbConnect();

  const ops: any[] = [];
  for (const lane of Object.keys(DEFAULTS)) {
    for (const carrier of ["DHL","Aramex","UPS"] as const) {
      for (const speed of ["standard","express"] as const) {
        const [minChargeKg, incrementStepKg, base, perKgAfterMin, fuelPct, remoteFee, insurancePct, insuranceMin] =
          DEFAULTS[lane][carrier][speed];
        ops.push({
          updateOne: {
            filter: { lane, carrier, speed },
            update: { $set: { lane, carrier, speed, minChargeKg, incrementStepKg, base, perKgAfterMin, fuelPct, remoteFee, insurancePct, insuranceMin } },
            upsert: true,
          }
        });
      }
    }
  }

  await ShippingRate.bulkWrite(ops);
  return res.status(200).json({ ok:true, upserted: ops.length });
}
