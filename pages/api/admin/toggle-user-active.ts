import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, active } = req.body;

  if (!userId || typeof active !== "boolean" || !Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId or status" });
  }

  await dbConnect();
  const user = await UserModel.findByIdAndUpdate(userId, { active }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({ message: "User status updated", user });
}
