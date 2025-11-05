import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const rows = await Transaction.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .select("_id user amount currency status description processor createdAt")
    .lean();
  res.json({ rows });
}
