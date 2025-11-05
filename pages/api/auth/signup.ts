// pages/api/auth/signup.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import EmailToken from "@/lib/models/EmailToken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  await dbConnect();

  const {
    firstName,
    lastName,
    email,
    password,
    country,
    phone,
    addressLabel = "Home",
    address1,
    address2,
    city,
    state,
    postalCode,
  } = (req.body || {}) as Record<string, string>;

  if (!firstName || !lastName || !email || !password || !country) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // simple password rule (same as before)
  const PASS = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!PASS.test(password)) {
    return res.status(400).json({
      error: "Password must be 8+ chars with upper, lower and number.",
    });
  }

  // already registered?
  const exists = await UserModel.findOne({ email });
  if (exists) {
    return res.status(409).json({ error: "Email already registered." });
  }

  // generate unique suite
  let suiteId = "";
  let existsSuite = true;
  while (existsSuite) {
    suiteId = "UAE-" + Math.floor(10000 + Math.random() * 90000);
    existsSuite = !!(await UserModel.findOne({ suiteId }));
  }

  const hashed = await bcrypt.hash(password, 10);

  // build addresses
  const addresses: any[] = [];
  if (address1 || address2 || city || state || postalCode || country) {
    addresses.push({
      label: addressLabel,
      address: address1 || "",
      address2: address2 || "",
      city: city || "",
      state: state || "",
      postalCode: postalCode || "",
      country,
    });
  }

  // 1) create user
  const user = await UserModel.create({
    email,
    name: `${firstName} ${lastName}`,
    password: hashed,
    suiteId,
    country,
    phone: phone || undefined,
    role: "user",
    status: "Active",
    emailVerified: false,
    ...(addresses.length ? { addresses } : {}),
  });

  // 2) create email token in EmailToken collection (this is what your /api/auth/email/verify expects)
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

  await EmailToken.create({
    userId: user._id,
    email: user.email,
    token,
    type: "verify",
    expiresAt: expires,
  });

  // 3) send email
  // choose the base URL from env
  const baseUrl =
    process.env.APP_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  await sendVerificationEmail(user.email, verifyUrl);

  return res.status(201).json({ success: true, suiteId: user.suiteId });
}

// --- helpers ---

async function sendVerificationEmail(to: string, verifyUrl: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    secure: +(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      `"Cross Border Cart" <no-reply@crossbordercart.com>`,
    to,
    subject: "Verify your email address",
    html: `
      <div style="font-family:sans-serif">
        <h2>Welcome to Cross Border Cart 👋</h2>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="color:#0d6efd">${verifyUrl}</a></p>
        <p>This link expires in 30 minutes.</p>
      </div>
    `,
  });
}
