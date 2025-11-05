// pages/api/shipping/rates.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment"; // make sure this exists
import { createShipmentAndRates } from "@/lib/shipping/provider";

// If you want to enforce admin-only, you can enable the next two lines
// import { getServerSession } from "next-auth/next";
// import { authOptions } from "@/pages/api/auth/[...nextauth]";

type RatesBody = {
  orderId?: string;
  currency?: string;
  customerEmail?: string;
  to: {
    name?: string;
    line1: string; line2?: string;
    city: string; postalCode?: string; country: string;
    phone?: string; email?: string;
  };
  from: {
    name?: string;
    line1: string; line2?: string;
    city: string; postalCode?: string; country: string;
    phone?: string; email?: string;
  };
  parcel: { length: number; width: number; height: number; weight: number };
};

function fail(res: NextApiResponse, code: number, msg: string, details?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[shipping/rates]", msg, details || "");
  }
  return res.status(code).json({ ok: false, error: msg, details });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Method Not Allowed");
  }

  // Optional: lock to admins only
  // const session = (await getServerSession(req, res, authOptions as any)) as any;
  // if (!session?.user?.id || !["admin","superadmin"].includes(session?.user?.role)) {
  //   return fail(res, 403, "Forbidden");
  // }

  const body = (req.body || {}) as RatesBody;

  // Basic validation
  const currency = String(body.currency || "AED").toUpperCase();
  if (!body.to?.line1 || !body.to?.city || !body.to?.country) {
    return fail(res, 400, "Invalid 'to' address");
  }
  if (!body.from?.line1 || !body.from?.city || !body.from?.country) {
    return fail(res, 400, "Invalid 'from' address");
  }
  const p = body.parcel || ({} as any);
  const parcelOk =
    Number.isFinite(p.length) &&
    Number.isFinite(p.width) &&
    Number.isFinite(p.height) &&
    Number.isFinite(p.weight) &&
    p.length > 0 && p.width > 0 && p.height > 0 && p.weight > 0;

  if (!parcelOk) return fail(res, 400, "Invalid parcel (length/width/height/weight required and > 0)");

  try {
    await dbConnect();

    // Ask provider for a carrier shipment & rates
    const result = await createShipmentAndRates({
      to:   { ...body.to,   postalCode: body.to.postalCode },
      from: { ...body.from, postalCode: body.from.postalCode },
      parcel: { length: +p.length, width: +p.width, height: +p.height, weight: +p.weight },
      currency,
      orderId: body.orderId,
      customerEmail: body.customerEmail,
    });

    // Persist Shipment locally (status: rated)
    const created = await Shipment.create({
      orderId: body.orderId,
      currency,
      to: {
        name: body.to.name, line1: body.to.line1, line2: body.to.line2,
        city: body.to.city, postalCode: body.to.postalCode, country: body.to.country,
        phone: body.to.phone, email: body.to.email,
      },
      from: {
        name: body.from.name, line1: body.from.line1, line2: body.from.line2,
        city: body.from.city, postalCode: body.from.postalCode, country: body.from.country,
        phone: body.from.phone, email: body.from.email,
      },
      parcel: { length: +p.length, width: +p.width, height: +p.height, weight: +p.weight },
      providerShipmentId: result.providerShipmentId,
      status: "rated",
      // store an email to use when we send the label later
      customerEmail: body.customerEmail || body.to.email || null,
      // optionally store a snapshot of top few rates (for debugging)
      ratesSnapshot: (result.rates || []).slice(0, 10),
      createdAt: new Date(),
    });

    return res.status(201).json({
      ok: true,
      data: {
        shipmentId: String(created._id),
        rates: result.rates || [],
      },
    });
  } catch (err: any) {
    return fail(res, 500, "Failed to get rates", err?.message || String(err));
  }
}
