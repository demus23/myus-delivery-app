import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import ShippingSettings from "@/lib/models/ShippingSettings";

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session || !isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  await dbConnect();

  if (req.method === "GET") {
    const doc = await ShippingSettings.findOne().lean();
    return res.status(200).json({ ok: true, settings: doc || { lanes: {} } });
  }

  if (req.method === "PUT") {
    const { lanes } = req.body || {};
    if (!lanes || typeof lanes !== "object") {
      return res.status(400).json({ ok: false, error: "lanes object required" });
    }
    const doc = await ShippingSettings.findOneAndUpdate(
      {},
      { $set: { lanes } },
      { upsert: true, new: true }
    ).lean();
    return res.status(200).json({ ok: true, settings: doc });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
}
