// pages/api/shipping/quote.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { errorMessage } from "@/utils/errors";

/* =========================
   Types & tiny helpers
   ========================= */
type Speed = "standard" | "express";

type ReqBody = {
  from?: { country?: string };
  to?: { country?: string; postcode?: string };
  weightKg?: unknown;
  dims?: { L?: unknown; W?: unknown; H?: unknown };
  speed?: Speed;
  carriers?: Partial<Record<"DHL" | "Aramex" | "UPS", boolean>>;
  currency?: string; // future: convert
  insurance?: { add?: boolean; declared?: unknown };
  remoteArea?: boolean;
};

type Quote = {
  carrier: "DHL" | "Aramex" | "UPS";
  speed: Speed;
  chargeableKg: number;
  priceAED: number;
  etaDays?: number;
  breakdown: {
    baseAED: number;
    fuelAED: number;
    remoteAED: number;
    insuranceAED: number;
    markupAED: number;
  };
  notes?: string[];
};

const asStr = (x: unknown) => (typeof x === "string" ? x.trim() : "");
const asNum = (x: unknown) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
};
const posNumOr = (x: unknown, dflt: number) => {
  const n = asNum(x);
  return n > 0 ? n : dflt;
};

/* =========================
   Default carrier settings
   ========================= */
type CarrierKey = "DHL" | "Aramex" | "UPS";
type CarrierSetting = {
  enabled: boolean;
  divisor: number; // volumetric divisor (L*W*H / divisor)
  baseKg: { standard: number; express: number }; // AED per kg
  min: { standard: number; express: number }; // minimum AED
  fuelPct: number; // %
  markupPct: number; // %
  etaDays: { standard: number; express: number };
};

const DEFAULTS: Record<CarrierKey, CarrierSetting> = {
  DHL: {
    enabled: true,
    divisor: 5000,
    baseKg: { standard: 20, express: 30 },
    min: { standard: 60, express: 90 },
    fuelPct: 12,
    markupPct: 10,
    etaDays: { standard: 4, express: 2 },
  },
  Aramex: {
    enabled: true,
    divisor: 5000,
    baseKg: { standard: 20, express: 30 },
    min: { standard: 60, express: 90 },
    fuelPct: 12,
    markupPct: 10,
    etaDays: { standard: 4, express: 2 },
  },
  UPS: {
    enabled: true,
    divisor: 5000,
    baseKg: { standard: 20, express: 30 },
    min: { standard: 60, express: 90 },
    fuelPct: 12,
    markupPct: 10,
    etaDays: { standard: 4, express: 2 },
  },
};

const REMOTE_AREA_FLAT_AED = 35;
const INSURANCE_RATE = 0.005; // 0.5%
const INSURANCE_MIN_AED = 10;
const ok = (res: NextApiResponse, body: any) => res.status(200).json({ ok: true, ...body });
const fail = (res: NextApiResponse, code: number, msg: string, details?: any) =>
  res.status(code).json({ ok: false, error: msg, ...(details ? { details } : {}) });


/* ================================================================
   Optional DB overrides — tolerant to any export shape or absence
   ================================================================ */
async function applyDbOverrides(
  current: Record<CarrierKey, CarrierSetting>
): Promise<Record<CarrierKey, CarrierSetting>> {
  try {
    // Try to connect to DB regardless of export name
    try {
      const mongooseLib: any = await import("@/lib/mongoose").then((m) => m as any).catch(() => null);
      const connectFn =
        (mongooseLib && (mongooseLib.default || mongooseLib.connect || mongooseLib.dbConnect || mongooseLib.mongooseConnect)) ||
        null;
      if (typeof connectFn === "function") {
        await connectFn();
      }
    } catch {
      /* ignore: no DB connector */
    }

    // Try to load CarrierRate model; if not present, keep defaults
    let CarrierRateModel: any = null;
    try {
      CarrierRateModel = (await import("@/lib/models/CarrierRate")).default;
    } catch {
      return current;
    }
    if (!CarrierRateModel?.find) return current;

    const docs = await CarrierRateModel.find({}).lean?.();
    if (!Array.isArray(docs) || docs.length === 0) return current;

    const next = { ...current };
    for (const d of docs) {
      // Normalize name -> CarrierKey
      const nm = String(d?.carrier ?? d?.name ?? "").toUpperCase();
      const key: CarrierKey | null =
        nm === "DHL" ? "DHL" : nm === "ARAMEX" ? "Aramex" : nm === "UPS" ? "UPS" : null;
      if (!key) continue;

      const cur = next[key];
      next[key] = {
        enabled: Boolean(d?.enabled ?? cur.enabled),
        divisor: posNumOr(d?.divisor ?? d?.volumetricDivisor, cur.divisor),
        baseKg: {
          standard: posNumOr(d?.baseStd ?? d?.baseStandard, cur.baseKg.standard),
          express: posNumOr(d?.baseExp ?? d?.baseExpress, cur.baseKg.express),
        },
        min: {
          standard: posNumOr(d?.minStd ?? d?.minStandard, cur.min.standard),
          express: posNumOr(d?.minExp ?? d?.minExpress, cur.min.express),
        },
        fuelPct: posNumOr(d?.fuelPct, cur.fuelPct),
        markupPct: posNumOr(d?.markupPct, cur.markupPct),
        etaDays: {
          standard: posNumOr(d?.etaStd ?? d?.etaStandard, cur.etaDays.standard),
          express: posNumOr(d?.etaExp ?? d?.etaExpress, cur.etaDays.express),
        },
      };
    }
    return next;
  } catch {
    // Any error: fall back to provided current
    return current;
  }
}

/* =========================
   Core computations
   ========================= */
function calcChargeableKg(
  actualKg: number,
  dims: { L?: number; W?: number; H?: number } | undefined,
  divisor: number
) {
  if (
    dims &&
    Number.isFinite(dims.L) &&
    Number.isFinite(dims.W) &&
    Number.isFinite(dims.H) &&
    (dims.L as number) > 0 &&
    (dims.W as number) > 0 &&
    (dims.H as number) > 0
  ) {
    const vol = ((dims.L as number) * (dims.W as number) * (dims.H as number)) / divisor;
    return Math.max(actualKg, vol);
  }
  return actualKg;
}

function buildQuoteForCarrier(
  carrier: CarrierKey,
  s: CarrierSetting,
  speed: Speed,
  weightKg: number,
  dimsCm: { L?: number; W?: number; H?: number } | undefined,
  opts: { insuranceAED: number; remoteAED: number }
): Quote {
  const chargeable = calcChargeableKg(weightKg, dimsCm, s.divisor);
  const basePerKg = s.baseKg[speed];
  const min = s.min[speed];

  const base = Math.max(min, basePerKg * chargeable);
  const fuel = (s.fuelPct / 100) * base;
  const preMarkup = base + fuel + opts.remoteAED + opts.insuranceAED;
  const markup = (s.markupPct / 100) * preMarkup;
  const total = preMarkup + markup;

  return {
    carrier,
    speed,
    chargeableKg: Number(chargeable.toFixed(2)),
    priceAED: Number(total.toFixed(2)),
    etaDays: s.etaDays[speed],
    breakdown: {
      baseAED: Number(base.toFixed(2)),
      fuelAED: Number(fuel.toFixed(2)),
      remoteAED: Number(opts.remoteAED.toFixed(2)),
      insuranceAED: Number(opts.insuranceAED.toFixed(2)),
      markupAED: Number(markup.toFixed(2)),
    },
  };
}

/* =========================
   API handler
   ========================= */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as ReqBody;

    const fromCountry = asStr(body?.from?.country) || "United Arab Emirates";
    const toCountry = asStr(body?.to?.country) || "United Kingdom";
    // postcode available via asStr(body?.to?.postcode) if you need remote logic per carrier

    const speed: Speed = asStr(body?.speed) === "express" ? "express" : "standard";
    const weightKg = posNumOr(body?.weightKg, 1);

    const dimsIn = body?.dims || {};
    const L = asNum(dimsIn?.L);
    const W = asNum(dimsIn?.W);
    const H = asNum(dimsIn?.H);
    const dimsCm =
      Number.isFinite(L) && Number.isFinite(W) && Number.isFinite(H) && L > 0 && W > 0 && H > 0
        ? { L, W, H }
        : undefined;

    const carriersInput = body?.carriers || { DHL: true, Aramex: true, UPS: true };
    const requested: CarrierKey[] = (["DHL", "Aramex", "UPS"] as CarrierKey[]).filter(
      (c) => Boolean((carriersInput as Record<string, boolean>)[c])
    );
    if (requested.length === 0) {
      return res.status(400).json({ ok: false, error: "No carrier selected" });
    }

    // Simple rule: skip quoting same-country routes (tweak as needed)
    if (fromCountry.toLowerCase() === toCountry.toLowerCase()) {
      return res.status(200).json({ ok: true, currency: "AED", from: fromCountry, to: toCountry, quotes: [] as Quote[] });
    }

    // Optional surcharges
    const insuranceAED =
      body?.insurance?.add && posNumOr(body?.insurance?.declared, 0) > 0
        ? Math.max(INSURANCE_MIN_AED, INSURANCE_RATE * posNumOr(body?.insurance?.declared, 0))
        : 0;

    const remoteAED = body?.remoteArea ? REMOTE_AREA_FLAT_AED : 0;

    // Get effective settings (defaults + DB overrides if available)
    const effective = await applyDbOverrides(DEFAULTS);

    const quotes: Quote[] = [];
    for (const c of requested) {
      const cfg = effective[c];
      if (!cfg?.enabled) continue;
      const q = buildQuoteForCarrier(c, cfg, speed, weightKg, dimsCm, {
        insuranceAED,
        remoteAED,
      });
      quotes.push(q);
    }

    quotes.sort((a, b) => a.priceAED - b.priceAED);

    return res.status(200).json({
      ok: true,
      currency: "AED",
      from: fromCountry,
      to: toCountry,
      quotes,
    });
  

} catch (e: unknown) {
  return res
    .status(500)
    .json({ ok: false, error: errorMessage(e) || "Internal Server Error" });
}
}