// pages/api/shipping/track-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";

const TOKEN = process.env.SHIP_TRACK_WEBHOOK_TOKEN || "";

type Normalized = {
  trackingNumber?: string;
  providerShipmentId?: string;
  status?: string;
  details?: any;
};

function mapCarrierStatus(s?: string): string | undefined {
  if (!s) return;
  const t = s.toLowerCase();
  if (/(delivered)/.test(t)) return "delivered";
  if (/(out_for_delivery|out for delivery)/.test(t)) return "out_for_delivery";
  if (/(transit|in_transit)/.test(t)) return "in_transit";
  if (/(return)/.test(t)) return "return_to_sender";
  if (/(exception|failure|error|cancel)/.test(t)) return "exception";
  return undefined;
}

function parseEasyPost(body: any): Normalized {
  // EasyPost webhook: { description:"tracker.updated", result:{ tracking_code, status, shipment_id, ... } }
  const r = body?.result || {};
  return {
    trackingNumber: r.tracking_code,
    providerShipmentId: r.shipment_id,
    status: mapCarrierStatus(r.status),
    details: r,
  };
}

function parseShippo(body: any): Normalized {
  // Shippo tracking webhook: { data: { tracking_number, tracking_status:{ status }, shipment, carrier }, event }
  const d = body?.data || {};
  const s = d?.tracking_status?.status || d?.tracking_status?.substatus;
  return {
    trackingNumber: d.tracking_number,
    providerShipmentId: d.shipment || d.object_id,
    status: mapCarrierStatus(String(s)),
    details: body,
  };
}

function parseMock(body: any): Normalized {
  // Our internal calls or tests: { trackingNumber, providerShipmentId, status }
  return {
    trackingNumber: body?.trackingNumber,
    providerShipmentId: body?.providerShipmentId,
    status: body?.status,
    details: body,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  // token check (only skip if you intentionally want to open it)
  const headerVal =
  req.headers["x-webhook-token"] ??
  req.headers["x-ship-track-token"] ??
  req.headers["x-api-key"];

const tok = Array.isArray(headerVal) ? headerVal[0] : headerVal;
const TOKEN = process.env.SHIP_TRACK_WEBHOOK_TOKEN || "";

console.log("[track-webhook] tokLen:", tok ? String(tok).length : 0, "envLen:", TOKEN.length);

if (!TOKEN || !tok || tok !== TOKEN) {
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}


  await dbConnect();

  const provider = (process.env.CARRIER_PROVIDER || "mock").toLowerCase();
  let norm: Normalized;

  try {
    if (provider === "easypost") {
      norm = parseEasyPost(req.body);
    } else if (provider === "shippo") {
      norm = parseShippo(req.body);
    } else {
      norm = parseMock(req.body);
    }
  } catch (err: unknown) {
  const details =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);

  return res
    .status(400)
    .json({ ok: false, error: "Bad payload", details });
}


  const { trackingNumber, providerShipmentId, status, details } = norm;
  if (!trackingNumber && !providerShipmentId) {
    return res.status(400).json({ ok: false, error: "Missing tracking identifiers" });
  }

  // Find the shipment by trackingNumber first, fallback to providerShipmentId
  const doc = await Shipment.findOne(
    trackingNumber
      ? { trackingNumber }
      : { providerShipmentId }
  );

  if (!doc) {
    // You might want to upsert or log; we’ll just 202 accept-and-ignore
    return res.status(202).json({ ok: true, ignored: true, reason: "shipment not found" });
  }

  // Build update
  const updates: any = { updatedAt: new Date() };
  if (status) updates.status = status as any;
  if (trackingNumber && !doc.trackingNumber) updates.trackingNumber = trackingNumber;

  // Keep an activity trail
  const activity = doc.activity || [];
  activity.push({ at: new Date(), type: "tracking.webhook", payload: { provider, status, trackingNumber } });
  updates.activity = activity;

  await Shipment.updateOne({ _id: doc._id }, { $set: updates });

  return res.status(200).json({ ok: true });
}
