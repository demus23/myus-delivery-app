import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.body;
  if (!id || !Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid package ID" });
  }

  await dbConnect();
  // Only allow deleting own packages with status Pending
  const deleted = await PackageModel.findOneAndDelete({ _id: id, user: session.user.id, status: "Pending" });
  if (!deleted) return res.status(404).json({ error: "Package not found or cannot be deleted" });

  res.status(200).json({ message: "Package deleted" });
}
