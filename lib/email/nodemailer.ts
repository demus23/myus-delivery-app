// lib/email/nodemailer.ts
import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465); // default to 465 for Hostinger
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error("SMTP ENV MISSING", { host, userPresent: !!user, passPresent: !!pass });
    throw new Error("SMTP env vars missing (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Hostinger: 465 = SSL
    auth: { user, pass },
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transporter = getTransporter();

  // accept both names
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    '"CrossBorderCart" <no-reply@crossbordercart.com>';

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log("MAIL SENT ✅", info.messageId, "→", to);
    return { ok: true };
  } catch (err) {
    // <-- THIS is what you were missing
    console.error("MAIL ERROR ❌", (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}
