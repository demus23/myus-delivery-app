// pages/api/shipments/notify-tracking.ts
import type { NextApiRequest, NextApiResponse } from "next";

// If your tsconfig has "paths": { "@/*": ["src/*"] } keep these imports.
// Otherwise, switch to relative paths like "../../../lib/email/resend".
import { sendEmail } from "@/lib/email/resend";
import TrackingAssignedEmail from "@/emails/TrackingAssigned";

// Put this helper near the top of the file (or in a utils module)
function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const anyErr = err as { message?: string; response?: { data?: any } };
    return (
      anyErr.response?.data?.error ??
      anyErr.response?.data?.message ??
      anyErr.message ??
      ""
    );
  }
  return "";
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simple CORS/preflight (optional)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
    return res.status(204).end();
  }

  // Show a tiny test UI on GET so you can submit a POST quickly from the browser
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`
      <html><body style="font-family:system-ui;padding:24px;line-height:1.5">
        <h2>Notify Tracking (POST test form)</h2>
        <form method="POST" action="/api/shipments/notify-tracking">
          <div style="margin:8px 0">
            <label>Email: <input name="customerEmail" value="test@example.com" /></label>
          </div>
          <div style="margin:8px 0">
            <label>Order ID: <input name="orderId" value="INV-001" /></label>
          </div>
          <div style="margin:8px 0">
            <label>Tracking No: <input name="trackingNumber" value="DHL123456" /></label>
          </div>
          <div style="margin:8px 0">
            <label>Carrier: <input name="carrierName" value="DHL" /></label>
          </div>
          <div style="margin:8px 0">
            <label>Admin Token: <input name="token" placeholder="paste ADMIN_API_TOKEN" /></label>
          </div>
          <button type="submit">Send</button>
          <p style="color:#666;margin-top:12px">Tip: use this only for local testing. In production,
          call this API from the server and keep your token secret.</p>
        </form>
      </body></html>
    `);
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET, OPTIONS");
    return res.status(405).send("Method Not Allowed");
  }

  // ---------- Auth ----------
  // Accept token from header OR from form field "token"
  const hdr = req.headers["x-admin-token"];
  const headerToken = Array.isArray(hdr) ? hdr[0] : hdr;

  const isForm = (req.headers["content-type"] || "").includes("application/x-www-form-urlencoded");
  const body = isForm ? ((req as any).body ?? {}) : (req.body ?? {});
  const providedToken = headerToken ?? body.token;

  // Prefer server-only ADMIN_API_TOKEN, but allow NEXT_PUBLIC_ADMIN_TOKEN for local testing
  const expectedToken =
    process.env.ADMIN_API_TOKEN ?? process.env.NEXT_PUBLIC_ADMIN_TOKEN;

  if (!expectedToken) {
    return res.status(500).json({
      error: "Server token not set. Define ADMIN_API_TOKEN in .env.local and restart dev server.",
    });
  }
  if (!providedToken || providedToken !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ---------- Validate payload ----------
  const customerEmail = (body.customerEmail || "").toString().trim();
  const orderId = (body.orderId || "").toString().trim();
  const trackingNumber = (body.trackingNumber || "").toString().trim();
  const carrierName = body.carrierName ? body.carrierName.toString().trim() : undefined;

  if (!customerEmail || !orderId || !trackingNumber) {
    return res
      .status(400)
      .json({ error: "customerEmail, orderId, trackingNumber are required" });
  }

  // ---------- Build track URL ----------
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const trackUrl = `${appUrl}/track?no=${encodeURIComponent(trackingNumber)}`;

  // ---------- Send email ----------
  try {
    // Guardrails for missing Resend config
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({
        error:
          "RESEND_API_KEY is missing. Add it to .env.local and restart dev server.",
      });
    }
    if (!process.env.EMAIL_FROM) {
      return res.status(500).json({
        error:
          "EMAIL_FROM is missing. Example: EMAIL_FROM=\"GulfShip <no-reply@gulfship.app>\"",
      });
    }

    await sendEmail({
  to: customerEmail,
  subject: `Tracking assigned for #${orderId}`,
  from: 'Cross Border Cart <no-reply@crossbordercart.com>', // ← force .com
  react: TrackingAssignedEmail({
    customerName: undefined,
    orderId,
    trackingNumber,
    carrierName,
    trackUrl,
  }),
});

   

    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
  const raw = extractMessage(e);
  const msg = raw.toLowerCase();

  // Friendly mapping for common Resend errors
  if (msg.includes("api key") || msg.includes("unauthorized")) {
    return res.status(500).json({
      error:
        "API key is invalid. Check RESEND_API_KEY (use a valid key) and make sure the sending domain is verified.",
    });
  }
  if (msg.includes("domain not verified") || msg.includes("from address")) {
    return res.status(500).json({
      error:
        "Your sending domain or EMAIL_FROM may not be verified in Resend. Verify domain and use a verified FROM address.",
    });
  }

  console.error("[notify-tracking] sendEmail error:", e);
  return res.status(500).json({ error: raw || "Failed to send tracking email" });
}
}
