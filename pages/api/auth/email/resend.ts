// pages/api/auth/email/resend.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import type { IEmailToken } from "@/lib/models/EmailToken";
import crypto from "crypto";
import nodemailer from "nodemailer";

const VERIFY_TTL_MIN = 60 * 24;    // 24h
const RESEND_COOLDOWN_SEC = 60;    // 1 min

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    // Require a logged-in user for anti-abuse
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Accept userId (admin only) OR email (self, or admin for others)
  const bodyUserId = (req.body?.userId as string | undefined)?.trim();
  const bodyEmail = (req.body?.email as string | undefined)?.trim()?.toLowerCase();

  let targetUser = null;

  if (bodyUserId) {
    // Only admins can trigger by userId
    if (!isAdmin(session)) return res.status(403).json({ error: "Forbidden" });
    targetUser = await UserModel.findById(bodyUserId);
  } else if (bodyEmail) {
    // Self-serve for the same email; admins may target any email
    if (!isAdmin(session) && bodyEmail !== (session.user?.email || "").toLowerCase()) {
      return res.status(403).json({ error: "Forbidden" });
    }
    targetUser = await UserModel.findOne({ email: bodyEmail });
  } else {
    // Default to the session's own email
    const selfEmail = (session.user?.email || "").toLowerCase();
    if (!selfEmail) return res.status(400).json({ error: "Email is required." });
    targetUser = await UserModel.findOne({ email: selfEmail });
  }

  // Always return 200 to avoid leaking existence
  if (!targetUser) {
    return res
      .status(200)
      .json({ ok: true, note: "If that account exists, we've sent a verification link." });
  }

  if (targetUser.emailVerified) {
    return res.status(200).json({ ok: true, alreadyVerified: true });
  }

  // Cooldown
  const recent = await EmailToken.findOne({ userId: targetUser._id, type: "verify" })
    .sort({ createdAt: -1 })
    .lean<IEmailToken | null>();
  if (recent && (Date.now() - new Date(recent.createdAt).getTime()) / 1000 < RESEND_COOLDOWN_SEC) {
    return res.status(429).json({ error: "Please wait a moment before requesting again." });
  }

  // Clear previous verify tokens
  await EmailToken.deleteMany({ userId: targetUser._id, type: "verify" });

  // Create a fresh token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MIN * 60 * 1000);
  await EmailToken.create({
    userId: targetUser._id,
    email: targetUser.email,
    token,
    type: "verify",
    expiresAt,
    usedAt: null,
  });

  // Build link (kept as your /verify-email page)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendVerifyEmail(targetUser.email, verifyUrl);

  // In dev, return link for convenience
  if (/^true$/i.test(process.env.DEV_RETURN_VERIFY_LINK || "")) {
    return res.status(200).json({ ok: true, verifyUrl });
  }

  return res.status(200).json({ ok: true });
}

async function sendVerifyEmail(to: string, verifyUrl: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Cross Border Cart" <no-reply@crossbordercart.dev>`,
    to,
    subject: "Verify your email",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
        <h2>Verify your email</h2>
        <p>Click the button below to verify your email address.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Verify email</a></p>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  });
}
