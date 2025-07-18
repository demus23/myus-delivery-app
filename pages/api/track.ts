import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tracking } = req.query;

  if (!tracking || typeof tracking !== "string") {
    return res.status(400).json({ error: "Tracking number required" });
  }

  await dbConnect();
  const pkg = await PackageModel.findOne({ tracking }).lean();

  if (!pkg) {
    return res.status(404).json({ error: "Package not found" });
  }

  res.status(200).json({ package: pkg });
}
