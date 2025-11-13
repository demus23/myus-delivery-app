import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin","superadmin"].includes(role)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { trackingNumber, providerShipmentId, status } = req.body || {};
  if (!trackingNumber && !providerShipmentId) {
    return res.status(400).json({ ok: false, error: "Missing trackingNumber or providerShipmentId" });
  }

  const token = process.env.SHIP_TRACK_WEBHOOK_TOKEN || "";
  if (!token) return res.status(500).json({ ok: false, error: "Server missing SHIP_TRACK_WEBHOOK_TOKEN" });

  // Build origin (works locally & in prod)
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host!;
  const origin = `${proto}://${host}`;

  // Call your own webhook securely from the server
  const r = await fetch(`${origin}/api/shipping/track-webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-token": token,
    },
    body: JSON.stringify({ trackingNumber, providerShipmentId, status }),
  });

  const data = await r.json().catch(() => ({}));
  return res.status(r.status).json({ ok: r.ok, forward: data });
}
