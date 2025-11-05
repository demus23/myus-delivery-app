// pages/api/admin/logs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Log from "@/lib/models/Log";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { search } = req.query;
  const filter: any = {};

  if (search && typeof search === "string") {
    filter.$or = [
      { user: { $regex: search, $options: "i" } },
      { action: { $regex: search, $options: "i" } },
      { entity: { $regex: search, $options: "i" } },
      { detail: { $regex: search, $options: "i" } },
    ];
  }

  // Fetch logs (limit can be added)
  const logs = await Log.find(filter)
    .sort({ createdAt: -1 })
    .limit(300);

  res.status(200).json(logs);
}
