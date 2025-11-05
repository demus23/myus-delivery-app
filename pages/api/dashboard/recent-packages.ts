import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import Package from "@/lib/models/Package";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const items = await Package.find({})
    .sort({ updatedAt: -1 })
    .limit(10)
    .select("_id trackingNumber userName status createdAt updatedAt")
    .lean();

  res.status(200).json(items);
}
