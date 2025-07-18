// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  if (req.method === "GET") {
    const user = await UserModel.findOne({ email: session.user.email }).select("-password").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
