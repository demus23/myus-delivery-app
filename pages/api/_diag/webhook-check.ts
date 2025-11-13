import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const server = process.env.SHIP_TRACK_WEBHOOK_TOKEN || "";
  const client =
    String(req.headers["x-webhook-token"] ?? req.headers["x-ship-track-token"] ?? "");

  // Don't return the secrets; just lengths + equality
  res.status(200).json({
    ok: true,
    serverHasToken: Boolean(server),
    serverLen: server.length,
    clientLen: client.length,
    matches: server === client,
    rawHeaderNamePresent: "x-webhook-token" in req.headers || "x-ship-track-token" in req.headers,
  });
}
