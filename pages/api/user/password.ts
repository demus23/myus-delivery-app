import { getSession } from "next-auth/react";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();
  const session = await getSession({ req });
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const userId = session.user.id;
  const { old, new: newPw } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Verify old password
  const isValid = await bcrypt.compare(old, user.password);
  if (!isValid) return res.status(400).json({ error: "Incorrect old password" });

  // Update new password
  user.password = await bcrypt.hash(newPw, 10);
  await user.save();

  res.json({ ok: true });
}
