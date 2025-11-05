// pages/api/admin/charges/cancel/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { Activity } from "@/lib/models/Activity";
import { stripe } from "@/lib/stripe";

function fail(res: NextApiResponse, code: number, msg: string) {
  if (process.env.NODE_ENV !== "production") console.error("[cancel]", msg);
  return res.status(code).json({ ok: false, error: msg });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return fail(res, 403, "Forbidden");
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Method not allowed");
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  const reason = (req.body?.reason as string) || "Admin cancel";
  if (!invoiceNo) return fail(res, 400, "Missing invoiceNo");

  await dbConnect();

  const pay = await Payment.findOne({ invoiceNo });
  if (!pay) return fail(res, 404, "Invoice not found");
  if (pay.status !== "pending") return fail(res, 409, "Only pending invoices can be canceled");

  // If there’s a Checkout Session, try to expire it so the link dies
  const csId = (pay as any).stripeCheckoutSessionId as string | undefined;
  if (csId) {
    try {
      await stripe.checkout.sessions.expire(csId);
    } catch {
      // If it’s already complete/expired, ignore and proceed to mark failed
    }
  }

  pay.status = "failed";
  await pay.save();

  await Activity.create({
    action: "invoice.canceled",
    entity: "payment",
    entityId: invoiceNo,
    performedBy: new mongoose.Types.ObjectId(session.user.id),
    performedByEmail: session.user.email,
    details: { reason },
    ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string,
    ua: req.headers["user-agent"] || "",
    createdAt: new Date(),
  });

  return res.status(200).json({ ok: true });
}
