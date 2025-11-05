// pages/api/tracking/events.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { createTrackingEvent } from "@/lib/server/tracking";
import PackageModel, { type IPackage } from "@/lib/models/Package";
import UserModel from "@/lib/models/User";
import { sendMail } from "@/lib/server/mailer";
import { trackingEventEmail } from "@/lib/server/templates/trackingEventEmail";
import TrackingEvent from "@/lib/models/TrackingEvent";
import { rateLimit } from "@/lib/rateLimit";

type IUserLean = {
  email?: string | null;
  name?: string | null;
  trackingEmails?: boolean | null;
};

// Canonical status normalizer (align with other APIs)
function normalizeStatus(input?: string) {
  if (!input) return undefined;
  const v = String(input).trim().toLowerCase();
  if (v === "canceled") return "Cancelled";
  const map: Record<string, string> = {
    pending: "Pending",
    received: "Received",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    forwarded: "Forwarded",
    "in transit": "In Transit",
    in_transit: "In Transit",
    transit: "In Transit",
    problem: "Problem",
  };
  return map[v] || undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // Basic IP + tracking key for throttling
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "ip";
  const rateKey = `track:${ip}:${
    (req.method === "GET" ? (req.query as any).trackingNo : (req.body as any)?.trackingNo) || ""
  }`;
  if (!rateLimit(rateKey, 30, 60_000)) {
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }

  // ---------- CREATE tracking event ----------
  if (req.method === "POST") {
    try {
      const session = (await getServerSession(req, res, authOptions as any)) as any;

      // If you want admin-only event creation, uncomment below:
      // if (!["admin", "superadmin"].includes(session?.user?.role || "")) {
      //   return res.status(403).json({ ok: false, error: "Forbidden" });
      // }

      const {
        packageId,
        trackingNo,
        status,
        location = "",
        note = "",
        createdAt, // used only for email timestamp; not persisted
      } = (req.body || {}) as {
        packageId?: string;
        trackingNo?: string;
        status?: string;
        location?: string;
        note?: string;
        createdAt?: string;
      };

      if (!packageId || !trackingNo || !status) {
        return res
          .status(400)
          .json({ ok: false, error: "packageId, trackingNo, status are required" });
      }

      // 👇 Type the package so TS knows its shape
      const pkgDoc = await PackageModel.findById(String(packageId)).lean<IPackage | null>();
      if (!pkgDoc) return res.status(404).json({ ok: false, error: "Package not found" });

      // Anti-spoof: ensure the trackingNo belongs to that package
      const pkgTracking = pkgDoc.tracking ? String(pkgDoc.tracking) : undefined;
      if (pkgTracking && pkgTracking !== String(trackingNo)) {
        return res.status(400).json({ ok: false, error: "Tracking number does not match the package" });
      }

      const normalized = normalizeStatus(status) ?? status;

      // Do NOT pass createdAt to creator – model sets it
      const ev = await createTrackingEvent({
        packageId: String(packageId), // if your schema uses ObjectId, cast in the creator/model
        trackingNo: String(trackingNo),
        status: String(normalized),
        location: String(location || ""),
        note: String(note || ""),
        actorId: session?.user?.id || "system",
        actorName: session?.user?.name || session?.user?.email || "System",
      });

      // Resolve recipient & preference
      let recipient: string | undefined = pkgDoc.userEmail ? String(pkgDoc.userEmail) : undefined;
      let userName: string | undefined;
      let allow = true;

      if (!recipient && (pkgDoc as any).userId) {
        const user = await UserModel.findById((pkgDoc as any).userId)
          .select("email name trackingEmails")
          .lean<IUserLean | null>();
        if (user) {
          if (user.email) recipient = String(user.email);
          if (user.name) userName = String(user.name);
          if (typeof user.trackingEmails === "boolean") allow = user.trackingEmails;
        }
      }

      // Email (best effort)
      if (recipient && allow) {
        const whenISO =
          (ev as any)?.createdAt
            ? new Date((ev as any).createdAt).toISOString()
            : typeof createdAt === "string"
            ? createdAt
            : undefined;

        const { subject, html } = trackingEventEmail({
          name: userName,
          trackingNo: String(trackingNo),
          status: String(normalized),
          location: String(location || ""),
          note: String(note || ""),
          whenISO,
        });

        try {
          await sendMail({ to: recipient, subject, html });
        } catch (err) {
          console.warn("Email send failed:", (err as any)?.message || err);
        }
      }

      return res.status(201).json({ ok: true, event: ev });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);

      console.error(err);
      return res
        .status(500)
        .json({ ok: false, error: msg || "Failed to create tracking event" });
    }
  }

  // ---------- LIST tracking events ----------
  if (req.method === "GET") {
    try {
      const { trackingNo, packageId, limit = "50" } = req.query as {
        trackingNo?: string;
        packageId?: string;
        limit?: string | string[];
      };

      if (!trackingNo && !packageId) {
        return res
          .status(400)
          .json({ ok: false, error: "trackingNo or packageId required" });
      }

      const q: any = {};
      if (trackingNo) q.trackingNo = String(trackingNo);
      if (packageId) q.packageId = String(packageId); // cast to ObjectId here if your schema requires it

      const nRaw = Array.isArray(limit) ? limit[0] : limit;
      const n = Math.max(1, Math.min(500, parseInt(nRaw || "50", 10) || 50));

      const events = await TrackingEvent.find(q).sort({ createdAt: -1 }).limit(n);

      return res.status(200).json({ ok: true, events });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);

      console.error(err);
      return res
        .status(500)
        .json({ ok: false, error: msg || "Failed to fetch tracking events" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
