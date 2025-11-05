// pages/api/admin/shipments/[id]/events.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]"; // 👈 adjust if your path differs
import dbConnect from "@/lib/dbConnect";
import TrackingEvent from "@/lib/models/TrackingEvent";
import { createTrackingEvent } from "@/lib/server/tracking";
import { errorMessage } from "@/utils/errors";

// Safe session typing to avoid TS2339 on session.user
type SessionUser = { id?: string; name?: string; email?: string | null };
type MySession = { user?: SessionUser } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query as { id: string }; // treating this as packageId (OK even if your route is "shipments")
  const session = (await getServerSession(req, res, authOptions as any)) as MySession;

  if (req.method === "POST") {
    try {
      const { trackingNo, status, location = "", note = "" } = req.body || {};

      if (!id || !trackingNo || !status) {
        return res.status(400).json({
          ok: false,
          error: "packageId (from route :id), trackingNo, and status are required",
        });
      }

      const actorId = session?.user?.id ?? session?.user?.email ?? "system";
      const actorName = session?.user?.name ?? session?.user?.email ?? "System";

      // Central helper also updates the Package snapshot fields
      const ev = await createTrackingEvent({
        packageId: id,
        trackingNo,
        status,
        location,
        note,
        actorId,
        actorName,
      });

      return res.status(201).json({ ok: true, event: ev });
    } catch (e: unknown) {
  return res
    .status(500)
    .json({ ok: false, error: errorMessage(e) || "Failed to create event" });
}
  }

  if (req.method === "GET") {
    try {
      // You can also pass ?trackingNo=... to fetch by tracking number
      const { trackingNo, limit = "50" } = req.query as { trackingNo?: string; limit?: string };

      if (!id && !trackingNo) {
        return res.status(400).json({ ok: false, error: "id or trackingNo required" });
      }

      const q: any = {};
      if (trackingNo) q.trackingNo = trackingNo;
      else q.packageId = id;

      const events = await TrackingEvent.find(q)
        .sort({ createdAt: -1 })
        .limit(parseInt(String(limit), 10));

      return res.status(200).json({ ok: true, events });
   } catch (e: unknown) {
  return res
    .status(500)
    .json({ ok: false, error: errorMessage(e) || "Failed to fetch events"  });
} 
    
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
