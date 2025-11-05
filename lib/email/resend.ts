import { Resend } from "resend";
import { render } from "@react-email/render";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  html,
  from,
}: {
  to: string;
  subject: string;
  react?: React.ReactElement;
  html?: string;
  from?: string;
}) {
  // Ensure we always pass a string to Resend
  const rendered = html ?? (react ? await render(react) : "");
  if (!rendered) throw new Error("No email body provided");

  const sender = from ?? process.env.EMAIL_FROM ?? "no-reply@example.com";

  const { error } = await resend.emails.send({
    from: sender,
    to,
    subject,
    html: rendered, // <- guaranteed string
  });

  if (error) throw error;
}
