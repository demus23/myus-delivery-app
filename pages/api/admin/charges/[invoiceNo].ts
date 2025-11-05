// pages/api/admin/charges/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { logActivity } from "@/lib/audit";
import { getErrorMessage } from "@/utils/errors";

async function ensureDb() {
  if (mongoose.connection.readyState === 0) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

// Full status union and allowed PATCH targets
type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
const ALLOWED_TARGETS = ["succeeded", "failed", "refunded"] as const;
type Allowed = (typeof ALLOWED_TARGETS)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  const role = (session as any)?.user?.role as string | undefined;
  const userEmail = (session as any)?.user?.email as string | undefined;

  if (!userId || (role !== "admin" && role !== "superadmin")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  await ensureDb();

  const invoiceNo = String(req.query.invoiceNo);
  const payment = await Payment.findOne({ invoiceNo });
  if (!payment) {
    return res.status(404).json({ ok: false, error: "Invoice not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, data: payment });
  }

  if (req.method === "PATCH") {
    try {
      const { status, reason } = (req.body || {}) as { status?: string; reason?: string };

      // Validate requested next status
      const next = String(status || "").toLowerCase() as Allowed;
      if (!ALLOWED_TARGETS.includes(next)) {
        return res.status(400).json({ ok: false, error: "Invalid status" });
      }

      // Compare as plain strings to avoid union mismatch
      const fromStr = String(payment.status ?? "pending").toLowerCase();
      const toStr = next as string;

      const canTransition =
        (fromStr === "pending" && (toStr === "succeeded" || toStr === "failed")) ||
        (fromStr === "succeeded" && toStr === "refunded") ||
        (fromStr === "failed" && toStr === "succeeded");

      if (!canTransition) {
        return res.status(400).json({ ok: false, error: `Cannot change ${fromStr} -> ${toStr}` });
      }

      // Persist change
      payment.status = next;
      if (reason) {
        payment.metadata = { ...(payment.metadata || {}), adminNote: String(reason) };
      }
      await payment.save();

      // Audit (cast back to readable unions for the log payload)
      const from = fromStr as PaymentStatus;
      const to = next as Allowed;

      await logActivity(req, {
        action: "charge.status_changed",
        entity: "payment",
        entityId: String(payment.invoiceNo),
        details: { from, to, reason: reason || null },
        userId: userId!,
        email: userEmail,
      });

      return res.status(200).json({ ok: true, data: payment });
   } catch (e: unknown) {
    // Log full error for debugging
    console.error(e);

    // Don’t leak details in production
    const msg = getErrorMessage(e);
    const publicMsg = process.env.NODE_ENV === "production" ? "Internal error" : msg;

    return res.status(500).json({ ok: false, error: publicMsg });
  }
}

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
