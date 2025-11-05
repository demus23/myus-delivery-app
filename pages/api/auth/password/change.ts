// pages/api/auth/password/change.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import bcrypt from "bcryptjs";

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()\-_=+{}[\]|:;<>,.~]{8,}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields." });
  }
  if (!STRONG.test(newPassword)) {
    return res.status(400).json({
      error: "New password must be 8+ chars and include upper, lower and a number.",
    });
  }

  await dbConnect();
  const user = await UserModel.findById((session.user as any).id).select("+password");
  if (!user) return res.status(404).json({ error: "User not found." });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) return res.status(400).json({ error: "Current password is incorrect." });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.status(200).json({ ok: true });
}
