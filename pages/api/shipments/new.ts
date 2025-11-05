// pages/api/shipments/new.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose"; // <-- named export (fix #1)

import { Shipment } from "@/lib/models/Shipment";


/**
 * Minimal payload we expect from the UI's "Proceed" button.
 * (All numbers should already be validated client-side; we re-check here.)
 */
type CreatePayload = {
  from: { country: string };
  to: { country: string; postcode?: string };
  weightKg: number;
  dims?: { L?: number; W?: number; H?: number } | null;
  speed: "standard" | "express";
  carrier: "DHL" | "Aramex" | "UPS";
  service?: "standard" | "express";          // we map quote speed => service
  etaDays?: number;
  priceAED: number;
  breakdown?: {
    baseAED?: number;
    fuelAED?: number;
    remoteAED?: number;
    insuranceAED?: number;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const enabled = process.env.SHIPMENTS_ENABLED === "true";
  if (!enabled) {
    return res.status(403).json({ ok: false, error: "Shipment creation is disabled for this environment." });
  }

  



  try {
    await dbConnect();

    // Be tolerant about how auth might be attached (fix #2 – don't assume req.user exists)
    const userId =
      (req as any)?.user?.id ||
      (req as any)?.session?.user?.id ||
      (req as any)?.auth?.userId ||
      "guest";

    const body = (req.body || {}) as Partial<CreatePayload>;

    // Basic validation
    const weightKg = Number(body.weightKg);
    if (!body.from?.country || !body.to?.country || !Number.isFinite(weightKg) || weightKg <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    const priceAED = Number(body.priceAED);
    if (!Number.isFinite(priceAED) || priceAED < 0) {
      return res.status(400).json({ ok: false, error: "Invalid price" });
    }

    // Build the document to match your Shipment schema (no dimsCm/speed-on-option pitfalls)
    const doc = {
      userId,
      createdAt: new Date(),
      status: "draft",          // or "pending" if you prefer
      currency: "AED",
      from: body.from,
      to: body.to,
      weightKg,
      dims: body.dims ?? null,  // keep null if you don't collect dims yet
      speed: body.speed || "standard",
      // store the chosen quote as the first/only option for this simple flow
      options: [
        {
          carrier: body.carrier,
          service: body.service || body.speed || "standard",
          etaDays: Number(body.etaDays) || null,
          priceAED,
          breakdown: {
            baseAED: Number(body.breakdown?.baseAED) || 0,
            fuelAED: Number(body.breakdown?.fuelAED) || 0,
            remoteAED: Number(body.breakdown?.remoteAED) || 0,
            insuranceAED: Number(body.breakdown?.insuranceAED) || 0,
          },
        },
      ],
    };

    const created = await Shipment.create(doc);

    return res.status(200).json({ ok: true, id: String(created._id) });
 
} catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string"
      ? (e as { message: string }).message
      : "Create shipment failed";

  console.error("Server error:", e);
  return res.status(500).json({ ok: false, error: msg });
}
}
