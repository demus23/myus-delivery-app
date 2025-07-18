import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { packageId, status } = req.body;

  if (!packageId || !status || !Types.ObjectId.isValid(packageId)) {
    return res.status(400).json({ error: "Invalid packageId or status" });
  }

  await dbConnect();
  const pkg = await PackageModel.findByIdAndUpdate(packageId, { status }, { new: true });
  if (!pkg) return res.status(404).json({ error: "Package not found" });

  res.status(200).json({ message: "Package status updated", package: pkg });
}
