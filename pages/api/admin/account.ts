import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(403).json({ error: "Forbidden" });
  await dbConnect();

  // GET: Profile
  if (req.method === "GET") {
    const user = await UserModel.findOne({ email: session.user.email }, "-password");
    return res.status(200).json(user);
  }

  // PUT: Update Profile (name, avatar, etc.)
  if (req.method === "PUT") {
    const { name, avatar } = req.body;
    const updated = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      { name, avatar },
      { new: true }
    ).select("-password");
    return res.status(200).json(updated);
  }

  // PATCH: Change Password
  if (req.method === "PATCH") {
    const { oldPassword, newPassword } = req.body;
    const user = await UserModel.findOne({ email: session.user.email });
    if (!user || !user.password || !bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: "Incorrect old password" });
    }
    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
