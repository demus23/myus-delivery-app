import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import bcrypt from "bcryptjs";

function isStrong(pw: string) {
  // ≥8 chars, at least one lowercase, one uppercase, one number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()\-_=+{}[\]|:;<>,.~]{8,}$/.test(pw);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // 1) Validate token (GET)
  if (req.method === "GET") {
    const { token } = req.query as { token?: string };
    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });

    const t = await EmailToken.findOne({
      token,
      type: "reset",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!t) return res.status(400).json({ ok: false, error: "Invalid or expired token" });
    return res.status(200).json({ ok: true });
  }

  // 2) Reset password (POST)
  if (req.method === "POST") {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });
    if (!password) return res.status(400).json({ ok: false, error: "Missing password" });
    if (!isStrong(password)) {
      return res.status(400).json({
        ok: false,
        error: "Password must be at least 8 characters and include upper, lower and a number.",
      });
    }

    const t = await EmailToken.findOne({
      token,
      type: "reset",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!t) return res.status(400).json({ ok: false, error: "Invalid or expired token" });

    const user = await User.findById(t.userId);
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // mark the token as used & clean other reset tokens for this user
    t.usedAt = new Date();
    await t.save();
    await EmailToken.deleteMany({ userId: user._id, type: "reset", _id: { $ne: t._id } });

    return res.status(200).json({ ok: true, message: "Password updated" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ ok: false, error: "Method Not Allowed" });
}
