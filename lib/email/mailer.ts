import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.MAIL_FROM || "no-reply@your-domain.com";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  if (!smtpHost) {
    console.log("[mailer] (DEV) Would send:", opts);
    return;
  }
  await transporter.sendMail({ from: fromEmail, ...opts });
}
