// pages/api/charge.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next"; // ← API-route import
import { authOptions } from "./auth/[...nextauth]";
import { Payment } from "@/lib/models/Payment";
import mongoose from "mongoose";
import { logActivity } from "@/lib/audit";

/** simple, local DB connector */
async function ensureDb() {
  if (mongoose.connection.readyState === 0) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

type MethodType = "card" | "paypal" | "wire";

/**
 * POST body:
 * {
 *   amount: number (minor units), currency: string,
 *   description?: string, metadata?: object,
 *   methodId?: string,
 *   method?: {
 *     type:"card"|"paypal"|"wire"; brand?; last4?; expMonth?; expYear?;
 *     paypalEmail?; wireReference?; label?;
 *   },
 *   billingAddress?: { fullName?; line1; line2?; city; state?; postalCode?; country; phone?; }
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  const userEmail = (session as any)?.user?.email as string | undefined;

  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  try {
    await ensureDb();

    // robust dynamic import (supports default or named export)
    const userModelMod = await import("@/lib/models/User");
    const User = (userModelMod as any).User || (userModelMod as any).default;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const {
      amount,
      currency,
      description,
      metadata,
      methodId,
      method: methodBody,
      billingAddress: billingBody,
    } = req.body ?? {};

    // Validate amount/currency
    const amt = Number(amount);
    if (!Number.isFinite(amt) || Math.floor(amt) !== amt || amt < 1) {
      return res.status(400).json({ ok: false, error: "Valid integer 'amount' (minor units) is required" });
    }
    if (!currency || typeof currency !== "string" || currency.length < 3) {
      return res.status(400).json({ ok: false, error: "Valid 'currency' is required" });
    }

    // Resolve payment method
    let method: any = null;
    if (methodId) {
      const saved = (user.paymentMethods || []).find(
        (pm: any) => String(pm._id) === String(methodId) || String(pm.id) === String(methodId)
      );
      if (!saved) return res.status(400).json({ ok: false, error: "Saved payment method not found" });
      method = {
        type: saved.type,
        brand: saved.brand,
        last4: saved.last4,
        expMonth: saved.expMonth,
        expYear: saved.expYear,
        paypalEmail: saved.paypalEmail,
        wireReference: saved.wireReference,
        label: saved.label,
      };
    } else if (methodBody?.type) {
      const t = String(methodBody.type).toLowerCase() as MethodType;
      if (!["card", "paypal", "wire"].includes(t)) {
        return res.status(400).json({ ok: false, error: "Invalid payment method type" });
      }
      method = {
        type: t,
        brand: methodBody.brand,
        last4: methodBody.last4,
        expMonth: methodBody.expMonth,
        expYear: methodBody.expYear,
        paypalEmail: methodBody.paypalEmail,
        wireReference: methodBody.wireReference,
        label: methodBody.label,
      };
    } else {
      return res.status(400).json({ ok: false, error: "Provide 'methodId' or 'method' details" });
    }

    // Billing address (body overrides stored address)
    const billingAddress = billingBody ?? user.billingAddress ?? null;
    if (!billingAddress?.line1 || !billingAddress?.city || !billingAddress?.country) {
      return res.status(400).json({ ok: false, error: "Billing address is required (line1, city, country)" });
    }

    const status: "succeeded" | "pending" = method.type === "wire" ? "pending" : "succeeded";

    const p = await Payment.create({
      user: new mongoose.Types.ObjectId(userId),
      amount: amt,
      currency: String(currency).toUpperCase(),
      status,
      description: description || "",
      metadata: metadata || {},
      method,
      billingAddress,
    });
    if (!p.invoiceNo) {
  p.invoiceNo = `INV-${new Date().getFullYear()}-${String(p._id).slice(-6).toUpperCase()}`;
  await p.save();
}

    // audit trail
    await logActivity(req, {
      action: "charge.created",
      entity: "payment",
      entityId: String(p.invoiceNo ?? p._id), // in case invoiceNo is generated later
      details: {
        amount: amt,
        currency: String(currency).toUpperCase(),
        method: method?.type,
        status,
        description: description || "",
      },
      userId: String(userId),
      email: userEmail,
    });

    return res.status(201).json({ ok: true, data: p });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message || "Internal error" });
  }
}
