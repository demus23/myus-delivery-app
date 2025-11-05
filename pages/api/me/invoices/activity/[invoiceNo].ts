import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { Activity } from "@/lib/models/Activity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const sUser = session?.user;
  if (!sUser?.id && !sUser?._id) return res.status(401).json({ ok: false, error: "Unauthorized" });
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  await dbConnect();
  const invoiceNo = String(req.query.invoiceNo || "");
  const inv = await Payment.findOne({ invoiceNo }, { user: 1 }).lean();
  const myId = String(sUser.id || sUser._id);
  if (!inv || String(inv.user) !== myId) return res.status(403).json({ ok: false, error: "Forbidden" });

  const data = await Activity.find({ entity: "payment", entityId: invoiceNo })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // (optional) hide admin emails from user
  const scrubbed = data.map((a: any) => ({
    createdAt: a.createdAt,
    action: a.action,
    details: a.details,
  }));

  res.status(200).json({ ok: true, data: scrubbed });
}
