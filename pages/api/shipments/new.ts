// pages/api/shipments/new.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import { Shipment } from "@/lib/models/Shipment";

type Address = {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
};

type Body = Partial<{
  from: Address;
  to: Address;

  // NEW schema
  parcel: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  };

  // OLD schema
  weightKg: number;
  weight: number;
  dims: {
    L?: number;
    W?: number;
    H?: number;
    length?: number;
    width?: number;
    height?: number;
  };

  speed: string;
  carrier: string;
  service: string;
  priceAED: number;
  customerEmail: string;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
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

    const body = (req.body || {}) as Body;

    if (!body.from || !body.to) {
      return res.status(400).json({ ok: false, error: "from/to are required" });
    }

    // ---------- Build parcel from BOTH possible formats ----------
    let weight =
      body.parcel?.weight ??
      body.weightKg ??
      body.weight;

    let length =
      body.parcel?.length ??
      body.dims?.L ??
      body.dims?.length;

    let width =
      body.parcel?.width ??
      body.dims?.W ??
      body.dims?.width;

    let height =
      body.parcel?.height ??
      body.dims?.H ??
      body.dims?.height;

    weight = Number(weight);
    length = Number(length);
    width  = Number(width);
    height = Number(height);

    if (![weight, length, width, height].every(v => Number.isFinite(v) && v > 0)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid parcel – weight, length, width, height are required and must be > 0",
      });
    }

    const priceAED = Number(body.priceAED);
    if (!Number.isFinite(priceAED) || priceAED <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid price" });
    }

    const userId =
      (req as any)?.user?.id ||
      (req as any)?.session?.user?.id ||
      (req as any)?.auth?.userId ||
      "guest";

    const doc = {
      userId,
      currency: "AED",
      from: body.from,
      to: body.to,
      parcel: { weight, length, width, height },
      carrier: body.carrier,
      service: body.service ?? body.speed,
      status: "rated" as const,
      customerEmail: body.customerEmail ?? null,
      activity: [
        {
          at: new Date(),
          type: "created_via_api",
          payload: {
            source: "shipments/new",
            speed: body.speed,
            priceAED,
          },
        },
      ],
      ratesSnapshot: [
        {
          carrier: body.carrier,
          service: body.service ?? body.speed,
          amount: priceAED,
          currency: "AED",
        },
      ],
    };

    const created = await Shipment.create(doc);

    return res.status(200).json({ ok: true, id: String(created._id) });
  } catch (err: any) {
    console.error("Create shipment failed:", err);
    const msg =
      err?.message && typeof err.message === "string"
        ? err.message
        : "Create shipment failed";
    return res.status(500).json({ ok: false, error: msg });
  }
}
