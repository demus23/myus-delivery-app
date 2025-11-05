import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/db";
import FxRate, { type FxRateDoc } from "@/lib/models/FxRate";

const FALLBACK: Record<string, number> = { USD: 0.27225, EUR: 0.248, GBP: 0.2139 };

async function tryConnect(timeoutMs = 500) {
  try {
    await Promise.race([
      dbConnect(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("db-timeout")), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const base = String(req.query.base || "AED").toUpperCase();

  let rates = { ...FALLBACK };
  let fetchedAt: string | Date = new Date(0);
  let source = "fallback";

  const dbReady = await tryConnect(500);
  if (dbReady) {
    try {
      const doc = await FxRate.findOne({ base }).lean<FxRateDoc | null>();
      if (doc?.rates) {
        rates = { ...rates, ...doc.rates };
        fetchedAt = doc.fetchedAt || new Date();
        source = "db";
      }
    } catch {
      // keep fallback
    }
  }

  return res.status(200).json({ ok: true, base, rates, fetchedAt, source });
}
