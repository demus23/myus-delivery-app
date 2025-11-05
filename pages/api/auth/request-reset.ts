// pages/api/auth/request-reset.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email } = (req.body || {}) as { email?: string };
  if (!email) return res.status(400).json({ error: "Email is required." });

  await dbConnect();

  // Use findOne (NOT find) so we get a single doc or null
  const user = await UserModel.findOne({ email }).select("_id email");
  // Always respond 200 to avoid leaking which emails exist
  if (!user) {
    return res.status(200).json({ ok: true, message: "If that email exists, we’ve sent a reset link." });
  }

  // Create token (30 min)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await EmailToken.create({
    userId: user._id,
    email: user.email,
    token,
    type: "reset",
    expiresAt,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resetPath = process.env.RESET_PATH || "/reset-password";
  const resetUrl = `${baseUrl}${resetPath}?token=${token}`;

  // Send email
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: +(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Cross Border Cart <no-reply@crossbordercart.dev>",
      to: user.email,
      subject: "Reset your password",
      html: `<p>We received a request to reset your password.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a>.</p>
             <p>This link expires in 30 minutes. If you didn’t request this, you can ignore this email.</p>`,
    });
  } catch {
    // In dev, still return ok to keep UX smooth
  }

  // In dev, optionally return the link for quick testing
  if (process.env.DEV_RETURN_RESET_LINK === "true") {
    return res.status(200).json({
      ok: true,
      message: "If that email exists, we’ve sent a reset link.",
      devResetLink: resetUrl,
    });
  }

  return res.status(200).json({ ok: true, message: "If that email exists, we’ve sent a reset link." });
}
