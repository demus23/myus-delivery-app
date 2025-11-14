// pages/api/shipments/new.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only POST is supported
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  // Feature flag (enable per env)
  if (process.env.SHIPMENTS_ENABLED !== "true") {
    return res
      .status(403)
      .json({ ok: false, error: "Shipment creation is disabled for this environment." });
  }

  try {
    await dbConnect();

    const b: any = req.body || {};

    // Basic address checks
    if (!b?.from?.country || !b?.to?.country) {
      return res.status(400).json({ ok: false, error: "Invalid addresses" });
    }

    // Accept either b.parcel or (dims + weightKg) and map to required shape
    const parcel = b.parcel ?? {
      length: Number(b?.dims?.L ?? b?.length ?? 0),
      width: Number(b?.dims?.W ?? b?.width ?? 0),
      height: Number(b?.dims?.H ?? b?.height ?? 0),
      // allow weightKg (kg) or weight (g) – here we treat provided number as **grams** if > 100,
      // otherwise as **kg** and convert to grams. Adjust if you store grams vs. kg differently.
      weight: Number(
        b?.weight ??
          (Number.isFinite(b?.weightKg) ? Math.round(Number(b.weightKg) * 1000) : 0)
      ),
    };

    // Validate parcel
    for (const k of ["length", "width", "height", "weight"] as const) {
      const v = Number((parcel as any)[k]);
      if (!Number.isFinite(v) || v <= 0) {
        return res.status(400).json({ ok: false, error: `Invalid parcel.${k}` });
      }
    }

    // Build document to match the Shipment schema
    const doc = {
      orderId: b.orderId ?? undefined,
      currency: (b.currency || "AED").toUpperCase(),
      to: b.to,
      from: b.from,
      parcel,
      // Optional details
      carrier: b.carrier ?? undefined,
      service: b.service ?? undefined,
      customerEmail: b.customerEmail ?? undefined,
      // You can start new items as "rated" so they show nicely in admin list
      status: b.status || "rated",
      // Optional snapshot of the chosen price (minor units)
      ratesSnapshot: b.priceAED
        ? [
            {
              carrier: b.carrier ?? null,
              service: b.service ?? null,
              amount: Math.round(Number(b.priceAED) * 100) || 0,
              currency: (b.currency || "AED").toUpperCase(),
              etaDays: Number.isFinite(b.etaDays) ? Number(b.etaDays) : null,
            },
          ]
        : [],
      activity: [{ at: new Date(), type: "api:create" }],
    };

    const created = await Shipment.create(doc);
    return res.status(200).json({ ok: true, data: { id: String(created._id) } });
  } catch (e: any) {
    const msg =
      e?.message && typeof e.message === "string" ? e.message : "Create shipment failed";
    console.error("shipments/new error:", e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
