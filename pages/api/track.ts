// pages/api/track.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import TrackingEventModel from "@/lib/models/TrackingEvent";

type PkgDoc = {
  tracking: string;
  courier?: string | null;
  status?: string | null;
  location?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
};

type TrackEventDTO = {
  time: string;
  status?: string;
  location?: string | null;
  message?: string | null;
  trackingNo?: string;
  createdAt?: string;
};

type TrackOk = {
  ok: true;
  package: {
    tracking: string;
    courier: string | null;
    status: string;
    location: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  events: TrackEventDTO[];
};

type TrackErr = { ok: false; error: string };

function normalizeStatus(s?: string | null) {
  if (!s) return "Pending";
  const t = s.toLowerCase();
  if (t.includes("out") && t.includes("deliver")) return "Out for Delivery";
  if (t.includes("deliver")) return "Delivered";
  if (t.includes("transit") || t.includes("in-transit")) return "In Transit";
  if (t.includes("exception") || t.includes("fail") || t.includes("problem")) return "Problem";
  if (t.includes("pending") || t.includes("created") || t.includes("label")) return "Pending";
  return s[0].toUpperCase() + s.slice(1);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrackOk | TrackErr>
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    // support ?trackingNo= or ?tracking=
    const trackingNo =
      typeof req.query.trackingNo === "string"
        ? req.query.trackingNo.trim()
        : typeof req.query.tracking === "string"
        ? req.query.tracking.trim()
        : "";

    if (!trackingNo) return res.status(400).json({ ok: false, error: "trackingNo is required" });

    const rawLimit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 200;

    await dbConnect();

    const pkg = (await PackageModel.findOne({ tracking: trackingNo }).lean()) as unknown as
      | PkgDoc
      | null;

    // 🔁 Use the field that matches your schema:
    const eventsRaw = await TrackingEventModel.find({
  $or: [{ trackingNo: trackingNo }, { tracking: trackingNo }],
})
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();

    if (!pkg && eventsRaw.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    const events: TrackEventDTO[] = (eventsRaw || []).map((e: any) => {
      const when = e.createdAt ?? e.time ?? e.ts ?? Date.now();
      return {
        time: new Date(when).toISOString(),
        status: normalizeStatus(e.status),
        location: e.location ?? null,
        message: e.note ?? e.message ?? null,
        trackingNo: e.trackingNo ?? e.tracking ?? trackingNo,
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : undefined,
      };
    });

    const pkgOut = (pkg
      ? {
          tracking: String(pkg.tracking),
          courier: (pkg.courier as any) ?? null,
          status: normalizeStatus(pkg.status),
          location: (pkg.location as any) ?? null,
          createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : null,
          updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : null,
        }
      : {
          tracking: trackingNo,
          courier: null,
          status: events[0]?.status ?? "Pending",
          location: events[0]?.location ?? null,
          createdAt: null,
          updatedAt: null,
        }) as TrackOk["package"];

    return res.status(200).json({ ok: true, package: pkgOut, events });
  } catch (err) {
    console.error("GET /api/track error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
