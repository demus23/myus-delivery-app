import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  if (!id || !Types.ObjectId.isValid(id as string))
    return res.status(400).json({ error: "Invalid package ID" });

  await dbConnect();
  const pkg = await PackageModel.findOne({ _id: id, user: session.user.id });
  if (!pkg) return res.status(404).json({ error: "Package not found" });

  res.status(200).json({ package: pkg });
}
