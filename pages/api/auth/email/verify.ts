// pages/api/auth/email/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  await dbConnect();

  const token = (req.query.token as string | undefined) || "";
  if (!token) return res.status(400).json({ error: "Missing token." });

  const doc = await EmailToken.findOne({ token, type: "verify" });
  if (!doc) return res.status(400).json({ error: "Invalid or expired token." });

  if (doc.usedAt) return res.status(400).json({ error: "This token has already been used." });
  if (new Date() > doc.expiresAt) return res.status(400).json({ error: "Token expired." });

  const user = await UserModel.findById(doc.userId);
  if (!user) return res.status(400).json({ error: "User not found." });

  user.emailVerified = true;
  await user.save();

  // Either mark used or delete the token
  await EmailToken.deleteOne({ _id: doc._id });

  return res.status(200).json({ ok: true });
}
