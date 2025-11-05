// pages/api/admin/shipping-settings.ts
import type { NextApiRequest, NextApiResponse } from "next";
import ShippingSettings from "@/lib/models/ShippingSettings";
import { dbConnect } from "@/lib/mongoose";

// If you have next-auth in your project, keep these imports.
// If not, you can remove the guard that references them.
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type R =
  | { ok: true; settings: any }
  | { ok: false; error: string };
type MaybeSession = { user?: { role?: string } } | null;

// Default settings (returned if DB is empty)
const DEFAULT_SETTINGS = {
  forbidden: "IR,SY,KP",
  carriers: [
    {
      name: "DHL",
      enabled: true,
      divisor: 5000,
      basePerKgStd: 35,
      basePerKgExp: 55,
      minStdAED: 65,
      minExpAED: 95,
      fuelPct: 18,
      markupPct: 12,
      remoteSurchargeAED: 35,
      remotePrefixes: ["BT", "FO", "GL", "GI", "IM", "JE", "GG"],
    },
    {
      name: "Aramex",
      enabled: true,
      divisor: 5000,
      basePerKgStd: 30,
      basePerKgExp: 45,
      minStdAED: 60,
      minExpAED: 85,
      fuelPct: 16,
      markupPct: 10,
      remoteSurchargeAED: 30,
      remotePrefixes: ["TR21", "TR22"],
    },
    {
      name: "UPS",
      enabled: true,
      divisor: 5000,
      basePerKgStd: 32,
      basePerKgExp: 50,
      minStdAED: 62,
      minExpAED: 90,
      fuelPct: 17,
      markupPct: 11,
      remoteSurchargeAED: 32,
      remotePrefixes: ["FK", "AQ"],
    },
  ],
};

async function requireAdmin(req: NextApiRequest, res: NextApiResponse<R>) {
  if (process.env.DEV_UNLOCK_SETTINGS === "1") return true;

  try {
    // 👇 Cast the result so TS knows user/role may exist
    const session = (await getServerSession(req, res, authOptions as any)) as MaybeSession;
    const role = session?.user?.role;

    if (!session || !["admin", "superadmin"].includes(String(role))) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return false;
    }
    return true;
  } catch {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return false;
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse<R>) {
  const isOk = await requireAdmin(req, res);
  if (!isOk) return;

  await dbConnect();

  if (req.method === "GET") {
    const doc = await ShippingSettings.findOne({});
    // If nothing in DB yet, return defaults (do not auto-save unless you prefer)
    return res.status(200).json({
      ok: true,
      settings: doc ? doc.toObject() : { ...DEFAULT_SETTINGS, updatedAt: new Date() },
    });
  }

  if (req.method === "PUT") {
    try {
      const incoming = (req.body?.settings ?? req.body) as any;

      // Basic normalization of numbers
      const normalized = {
        forbidden: String(incoming.forbidden ?? ""),
        carriers: (Array.isArray(incoming.carriers) ? incoming.carriers : []).map((c: any) => ({
          name: String(c.name ?? ""),
          enabled: Boolean(c.enabled),
          divisor: Number(c.divisor ?? 5000),
          basePerKgStd: Number(c.basePerKgStd ?? 0),
          basePerKgExp: Number(c.basePerKgExp ?? 0),
          minStdAED: Number(c.minStdAED ?? 0),
          minExpAED: Number(c.minExpAED ?? 0),
          fuelPct: Number(c.fuelPct ?? 0),
          markupPct: Number(c.markupPct ?? 0),
          remoteSurchargeAED: Number(c.remoteSurchargeAED ?? 0),
          remotePrefixes: Array.isArray(c.remotePrefixes) ? c.remotePrefixes.map(String) : [],
        })),
        updatedAt: new Date(),
      };

      const doc = await ShippingSettings.findOneAndUpdate(
        {},
        normalized,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json({ ok: true, settings: doc.toObject() });
} catch (e: unknown) {
  let msg = "Invalid payload";
  if (e instanceof Error) msg = e.message;
  else if (typeof e === "string") msg = e;

  return res.status(400).json({ ok: false, error: msg });
}

  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
