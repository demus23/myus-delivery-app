// pages/api/shipments/new.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import { Shipment } from "@/lib/models/Shipment";

type CreatePayload = {
  orderId?: string;
  from: { country: string; line1: string; city: string; postalCode?: string; name?: string };
  to:   { country: string; line1: string; city: string; postalCode?: string; name?: string };
  weightKg?: number;
  // optional legacy parcel from old clients
  parcel?: { length?: number; width?: number; height?: number; weight?: number };
  dims?: { L?: number; W?: number; H?: number } | null;
  speed?: "standard" | "express";
  carrier?: string;
  service?: string;
  etaDays?: number;
  priceAED: number;
  breakdown?: {
    baseAED?: number;
    fuelAED?: number;
    remoteAED?: number;
    insuranceAED?: number;
  };
  customerEmail?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST – GET in browser will correctly return Method Not Allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const enabled = process.env.SHIPMENTS_ENABLED === "true";
  if (!enabled) {
    return res
      .status(403)
      .json({ ok: false, error: "Shipment creation is disabled for this environment." });
  }

  try {
    await dbConnect();

    // Try to grab a user id from any auth mechanism; fall back to "guest"
    const userId =
      (req as any)?.user?.id ||
      (req as any)?.session?.user?.id ||
      (req as any)?.auth?.userId ||
      "guest";

    const body = (req.body || {}) as Partial<CreatePayload>;

    // --- Validation --------------------------------------------------------
    if (!body.from?.country || !body.from?.line1 || !body.from?.city) {
      return res.status(400).json({ ok: false, error: "Invalid payload: missing from address" });
    }

    if (!body.to?.country || !body.to?.line1 || !body.to?.city) {
      return res.status(400).json({ ok: false, error: "Invalid payload: missing to address" });
    }

    const weightKg =
      typeof body.weightKg === "number"
        ? body.weightKg
        : typeof body.parcel?.weight === "number"
        ? body.parcel.weight
        : NaN;

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid payload: weightKg is required" });
    }

    const priceAED = Number(body.priceAED);
    if (!Number.isFinite(priceAED) || priceAED < 0) {
      return res.status(400).json({ ok: false, error: "Invalid price" });
    }

    // --- Build parcel & document ------------------------------------------
    const parcel = body.parcel ?? {
      length: body.dims?.L,
      width: body.dims?.W,
      height: body.dims?.H,
      weight: weightKg,
    };

    const doc = {
      userId,
      orderId: body.orderId,
      currency: "AED",

      from: body.from,
      to: body.to,

      weightKg,
      dims: body.dims ?? undefined,
      parcel,

      carrier: body.carrier,
      service: body.service || body.speed || "standard",
      selectedRateId: undefined,
      providerShipmentId: undefined,

      customerEmail: body.customerEmail ?? null,

      status: "draft",

      ratesSnapshot: [
        {
          carrier: body.carrier,
          service: body.service || body.speed || "standard",
          etaDays: body.etaDays ?? null,
          priceAED,
          breakdown: {
            baseAED: Number(body.breakdown?.baseAED) || 0,
            fuelAED: Number(body.breakdown?.fuelAED) || 0,
            remoteAED: Number(body.breakdown?.remoteAED) || 0,
            insuranceAED: Number(body.breakdown?.insuranceAED) || 0,
          },
        },
      ],

      activity: [
        {
          at: new Date(),
          type: "created",
          payload: { via: "api/shipments/new" },
        },
      ],
    };

    const created = await Shipment.create(doc);
    return res.status(200).json({ ok: true, id: String(created._id) });
  } catch (e: any) {
    console.error("Create shipment error:", e);
    const msg = e?.message ?? "Create shipment failed";
    return res.status(500).json({ ok: false, error: msg });
  }
}
