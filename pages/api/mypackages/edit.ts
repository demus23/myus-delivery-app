import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { id, title, description, courier, value } = req.body;
  if (!id || !Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid package ID" });
  }

  await dbConnect();
  // Only allow editing own "Pending" packages
  const pkg = await PackageModel.findOneAndUpdate(
    { _id: id, user: session.user.id, status: "Pending" },
    { title, description, courier, value },
    { new: true }
  );
  if (!pkg) return res.status(404).json({ error: "Package not found or cannot be edited" });

  res.status(200).json({ message: "Package updated", package: pkg });
}
