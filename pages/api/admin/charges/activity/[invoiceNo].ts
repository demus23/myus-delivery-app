import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Activity } from "@/lib/models/Activity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  const rows = await Activity.find({
    $or: [
      { entity: "payment", entityId: invoiceNo },
      { entity: "payment", "details.invoiceNo": invoiceNo },
    ],
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return res.status(200).json({ ok: true, data: rows || [] });
}
