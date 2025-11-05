import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  const from = process.env.EMAIL_FROM || "";
  res.status(200).json({
    hasKey: !!key,
    keyLooksValid: key.startsWith("re_") && key.length > 20,
    keyTail: key ? key.slice(-6) : null,      // masked tail to confirm which key is loaded
    from,
    appUrl: process.env.APP_URL || null,
  });
}
