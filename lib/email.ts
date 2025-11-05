import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP env vars missing (SMTP_HOST, SMTP_USER, SMTP_PASS).");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587/25
    auth: { user, pass },
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  const from =
    process.env.SMTP_FROM ||
    '"Cross Border Cart" <no-reply@crossbordercart.com>';

  await transporter.sendMail({ from, to, subject, html });
}
