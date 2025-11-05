// pages/api/invoices/pay/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { logActivity } from "@/lib/audit";

type SessionLite = { user?: { id?: string; email?: string; role?: string } } | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `Method ${req.method} not allowed` });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as unknown as SessionLite;
  const userId = session?.user?.id;
  const actorEmail = session?.user?.email;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const invoiceNo = String(req.query.invoiceNo || "").trim();
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

  await dbConnect();

  const doc: any = await Payment.findOne({ invoiceNo }).lean();
  if (!doc) return res.status(404).json({ ok: false, error: "Invoice not found" });
  if (String(doc.user) !== String(userId)) return res.status(403).json({ ok: false, error: "Forbidden" });
  if (doc.status !== "pending") return res.status(400).json({ ok: false, error: `Invoice is ${doc.status}, cannot pay` });

  const { methodId, method: methodBody } = req.body ?? {};

  // load user's saved methods (optional if a one-off methodBody is provided)
  let method: any = null;
  try {
    const userMod = await import("@/lib/models/User");
    const User = (userMod as any).User || (userMod as any).default;
    const user = await User.findById(userId).lean();
    if (methodId && user?.paymentMethods?.length) {
      const saved = (user.paymentMethods as any[]).find(
        (pm: any) => String(pm._id) === String(methodId) || String(pm.id) === String(methodId)
      );
      if (!saved) return res.status(400).json({ ok: false, error: "Saved payment method not found" });
      method = {
        type: saved.type,
        brand: saved.brand,
        last4: saved.last4,
        label: saved.label,
        expMonth: saved.expMonth,
        expYear: saved.expYear,
        paypalEmail: saved.paypalEmail,
        wireReference: saved.wireReference,
      };
    }
  } catch {
    // optional model; ignore
  }

  if (!method && methodBody?.type) {
    method = {
      type: methodBody.type,
      brand: methodBody.brand,
      last4: methodBody.last4,
      label: methodBody.label,
      expMonth: methodBody.expMonth,
      expYear: methodBody.expYear,
      paypalEmail: methodBody.paypalEmail,
      wireReference: methodBody.wireReference,
    };
  }
  if (!method) return res.status(400).json({ ok: false, error: "Provide methodId or method" });

  // Simulated capture: card/paypal => succeeded, wire => stays pending (await bank)
  const nextStatus = method.type === "wire" ? "pending" : "succeeded";

  const updated = await Payment.findOneAndUpdate(
    { invoiceNo },
    { $set: { method, status: nextStatus } },
    { new: true }
  );

  await logActivity(req, {
    action: "charge.paid",
    entity: "payment",
    entityId: String(invoiceNo),
    details: { method: method.type, from: "pending", to: nextStatus },
    userId: String(userId),
    email: actorEmail ?? "", // coalesce if your schema expects string
  });

  return res.status(200).json({ ok: true, data: updated });
}
