// pages/api/shipments/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/db";
import { Shipment } from "@/lib/models/Shipment";
import FxRate from "@/lib/models/FxRate";

type Sessionish = { user?: { id?: string; role?: string | null } } | null;

const FALLBACK_RATES: Record<string, number> = { USD: 0.2723, GBP: 0.2139 };

// Only allow these shipment fields to be updated
const allowed = [
  "status",
  "from",
  "to",
  "weightKg",
  "dims",
  "carrier",
  "service",
  "priceAED",
  "currency",
] as const;
type Allowed = (typeof allowed)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    // Optional currency display: ?currency=USD|GBP|AED (default AED)
    const displayCurrency = String(req.query.currency || "AED").toUpperCase();

    const sh = await Shipment.findById(id).lean();
    if (!sh) return res.status(404).json({ ok: false, error: "Shipment not found" });

    // Load FX (AED base)
    let rates: Record<string, number> = { ...FALLBACK_RATES };
    const fx = await FxRate.findOne({ base: "AED" }).lean();
    if (fx && typeof fx === "object" && "rates" in fx && fx.rates) {
      rates = { ...rates, ...(fx.rates as Record<string, number>) };
    }

    const priceAED = (sh as any).priceAED ?? 0;
    const convert = (amt: number, cur: string): number => {
      if (cur === "AED") return amt;
      const r = rates[cur];
      if (!r || !Number.isFinite(r)) return amt; // fallback to AED if missing
      return Math.round(amt * r * 100) / 100;
    };

    const price = {
      AED: priceAED,
      [displayCurrency]: convert(priceAED, displayCurrency),
    };

    return res.json({ ok: true, shipment: sh, price, displayCurrency });
  }

  if (req.method === "PATCH") {
    // Optional auth (kept minimal for TS)
    const session = (await getServerSession(req, res, {} as any)) as Sessionish;
    // You can enforce role here if needed:
    // if (session?.user?.role !== "admin") return res.status(403).json({ ok:false, error:"Forbidden" });

    // Build a $set object only with allowed keys
    const body = (req.body ?? {}) as Record<string, unknown>;
    const $set: Partial<Record<Allowed, unknown>> = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        $set[k] = body[k];
      }
    }

    const sh = await Shipment.findByIdAndUpdate(id, { $set }, { new: true }).lean();
    if (!sh) return res.status(404).json({ ok: false, error: "Shipment not found" });

    return res.json({ ok: true, shipment: sh });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
