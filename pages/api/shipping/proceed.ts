import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/db";
import Quote from "@/lib/models/Quote";
// Optional: only if you have a Shipment model. It's okay if create fails; we catch it.

import { Shipment } from "@/lib/models/Shipment";


const num = (v: any, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb);

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

/**
 * Accepts:
 *  - { quoteId, chosenIndex }
 *    (loads Quote from DB, picks option)
 *  - OR { from, to, weightKg, dims, speed, options:[...], chosenIndex }
 *    (no DB required)
 *
 * Returns: { ok, shipmentId?, prefill }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const {
      quoteId,
      chosenIndex,
      // inline fallback shape (if no DB / you didn’t save a quote)
      from: rawFrom,
      to: rawTo,
      weightKg,
      dims,
      speed,
      options,
    } = req.body || {};

    if (!(Number.isInteger(chosenIndex) && chosenIndex >= 0)) {
      return res.status(400).json({ ok: false, error: "chosenIndex is required" });
    }

    let from = rawFrom, to = rawTo, picked: any = null, wKg = num(weightKg, 0), d = dims, svc = speed;

    const dbReady = await tryConnect(500);

    // If we have a quoteId and DB is reachable, prefer DB record
    if (quoteId && dbReady) {
      try {
        const doc: any = await Quote.findById(quoteId).lean();
        if (!doc) return res.status(404).json({ ok: false, error: "Quote not found" });
        const arr = Array.isArray(doc.options) ? doc.options : [];
        if (!arr[chosenIndex]) return res.status(400).json({ ok: false, error: "Invalid chosenIndex" });

        picked = arr[chosenIndex];
        from = doc.from;
        to = doc.to;
        wKg = num(doc.weightKg, wKg);
        d = doc.dims || d;
        svc = doc.speed || svc;
    } catch (_err: unknown) {
  // Intentionally ignored: fallback below
}
    }

    // Inline fallback path (no DB quote)
    if (!picked) {
      const arr = Array.isArray(options) ? options : [];
      if (!arr[chosenIndex]) return res.status(400).json({ ok: false, error: "Invalid chosenIndex (inline)" });
      picked = arr[chosenIndex];
      if (!from || !to) return res.status(400).json({ ok: false, error: "from/to required for inline proceed" });
    }

    const prefill = {
      from,
      to,
      weightKg: wKg,
      dims: d || {},
      carrier: picked.carrier,
      service: svc || picked.service || "standard",
      priceAED: num(picked.priceAED, 0),
      breakdown: picked.breakdown || {},
      etaDays: picked.etaDays,
      currency: "AED",
    };

    let shipmentId: string | null = null;

    // Try to persist a Shipment if DB ready (non-fatal)
    if (dbReady) {
      try {
        const created: any = await Shipment.create({
          userId: null,            // you can populate from session if you want
          createdAt: new Date(),
          currency: "AED",
          status: "draft",
          from: prefill.from,
          to: prefill.to,
          weightKg: prefill.weightKg,
          dims: prefill.dims,
          carrier: prefill.carrier,
          service: prefill.service,
          priceAED: prefill.priceAED,
          quoteId: quoteId || null,
        });
        shipmentId = String(created._id);
      } catch (_) {
        // ignore (fallback still returns prefill)
      }
    } else {
      shipmentId = `temp-${Date.now()}`; // offline placeholder
    }

    return res.status(200).json({ ok: true, shipmentId, prefill });
  } catch (err: any) {
    console.error("PROCEED ERROR →", err);
    return res.status(200).json({ ok: false, error: err?.message || "Proceed failed" });
  }
}
