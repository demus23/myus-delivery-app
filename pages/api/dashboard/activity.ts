// pages/api/dashboard/activity.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import { Activity as ActivityModel } from "@/lib/models/Activity";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // adjust the query/shape to whatever you had
  const recent = await ActivityModel.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({ ok: true, data: recent });
}
