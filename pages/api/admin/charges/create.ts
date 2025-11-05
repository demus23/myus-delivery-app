// pages/api/admin/charges/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Schema, Types, model, models } from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe, getOrigin } from "@/lib/stripe"; // <-- use safe origin helper
import { sendMail } from "@/lib/email/nodemailer";
import { buildReceiptHtml } from "@/lib/invoices/receiptHtml";
import { buildPayNowHtml } from "@/lib/invoices/payNowHtml";
import { makeInvoiceToken } from "@/lib/tokens/signedUrl";
import { logActivity } from "@/lib/activity";

type AdminSession =
  | { user?: { id?: string; role?: string; email?: string } }
  | null;

type MethodType = "card" | "paypal" | "wire";
type StatusType = "succeeded" | "pending" | "failed" | "refunded";

function fail(res: NextApiResponse, code: number, msg: string, details?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[admin/charges/create]", msg, details || "");
  }
  return res.status(code).json({ ok: false, error: msg, details });
}
const isDup = (e: any) => e?.code === 11000 || /E11000|duplicate key/i.test(e?.message || "");

/* ------------ helpers ------------ */
function normalizeEmail(b: any): string | undefined {
  return b?.userEmail || b?.email || b?.user_email || b?.customerEmail || b?.customer_email;
}
function normalizeMethod(input: any): {
  type: MethodType; brand?: string; last4?: string; label?: string; paypalEmail?: string;
} {
  const raw = input?.type ?? input;
  const t = String(raw || "card").toLowerCase();
  const type: MethodType = (["card", "paypal", "wire"].includes(t) ? t : "card") as MethodType;
  return {
    type,
    brand: input?.brand || (type === "card" ? "manual" : undefined),
    last4: input?.last4 || (type === "card" ? "0000" : undefined),
    label: input?.label || (type === "card" ? "Admin charge" : type.toUpperCase()),
    paypalEmail: input?.paypalEmail,
  };
}
function todayBase() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `INV-${yyyy}${mm}${dd}`;
}

/* counter model */
type CounterDoc = { _id: string; seq: number };
const CounterSchema = new Schema<CounterDoc>(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { collection: "invoice_counters", versionKey: false }
);
const InvoiceCounter =
  (models.InvoiceCounter as mongoose.Model<CounterDoc>) ||
  model<CounterDoc>("InvoiceCounter", CounterSchema);

/** max seq from payments */
async function maxSeqInPayments(db: mongoose.mongo.Db, base: string): Promise<number> {
  const start = `${base}-0000`, end = `${base}-9999`;
  const doc = await db
    .collection<{ invoiceNo: string }>("payments")
    .find({ invoiceNo: { $gte: start, $lte: end } }, { projection: { invoiceNo: 1 } })
    .sort({ invoiceNo: -1 })
    .limit(1)
    .next();
  if (!doc?.invoiceNo) return 0;
  const m = doc.invoiceNo.match(/-(\d{4})$/);
  return m ? parseInt(m[1], 10) : 0;
}
async function allocateInvoiceNo(db: mongoose.mongo.Db): Promise<string> {
  const base = todayBase();
  const [current, maxUsed] = await Promise.all([
    InvoiceCounter.findById(base).lean(),
    maxSeqInPayments(db, base),
  ]);
  if (!current || (current.seq ?? 0) < maxUsed) {
    await InvoiceCounter.findByIdAndUpdate(
      base, { $set: { seq: maxUsed } }, { upsert: true, setDefaultsOnInsert: true }
    );
  }
  const updated = await InvoiceCounter.findByIdAndUpdate(
    base, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  const seqNum = updated?.seq ?? (maxUsed + 1);
  const seq = String(seqNum).padStart(4, "0");
  return `${base}-${seq}`;
}

async function getUserDoc(db: mongoose.mongo.Db, { userId, email }:{userId?:string; email?:string}) {
  const users = db.collection("users");
  if (userId) {
    try {
      const _id = new Types.ObjectId(String(userId));
      const u = await users.findOne({_id});
      if (u) return u;
    } catch {}
  }
  if (email) {
    const u = await users.findOne({ email: String(email) });
    if (u) return u;
    const ins = await users.insertOne({
      email: String(email),
      name: String(email).split("@")[0],
      emailVerified: null,
      createdAt: new Date(),
    } as any);
    const created = await users.findOne({ _id: ins.insertedId });
    return created;
  }
  throw new Error("User not found and no email provided");
}

/* -------------- handler -------------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, `Method ${req.method} Not Allowed`);
  }

  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  const role = session?.user?.role || "";
  if (!session?.user?.id || !["admin","superadmin"].includes(role)) {
    return fail(res, 403, "Forbidden");
  }

  const b: any = req.body || {};
  const email = normalizeEmail(b);
  const userIdStr: string | undefined = b.userId;

  const amountMajor = Number(b.amount ?? b.total ?? b.price);
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return fail(res, 400, "Amount must be a positive number");
  }
  const currency = String(b.currency || "AED").toUpperCase();
  const description = b.description || "Shipment charge";
  const methodRequested = normalizeMethod(b.method || b);
  const desiredStatus: StatusType = (b.status || "pending") as StatusType; // default to pending

  try {
    await dbConnect();
    const db = mongoose.connection.db as unknown as mongoose.mongo.Db;
    if (!db) return fail(res, 500, "Database connection not ready");

    // Load or create user document
    const userDoc: any = await getUserDoc(db, { userId: userIdStr, email });
    const userId = userDoc._id as Types.ObjectId;

    // Allocate invoice number & create payment (pending for now)
    const invoiceNo = await allocateInvoiceNo(db);
    const payment = await Payment.create({
      invoiceNo,
      amount: Math.round(amountMajor * 100), // MINOR units
      currency,
      description,
      status: desiredStatus,
      method: methodRequested,
      user: userId,
      email: userDoc?.email || email, // store for admin search
      billingAddress: {
        fullName: (b.billingAddress?.fullName || userDoc?.name || (email ? String(email).split("@")[0] : "Customer")),
        line1: b.billingAddress?.line1 || "N/A",
        line2: b.billingAddress?.line2 || "",
        city: b.billingAddress?.city || "N/A",
        state: b.billingAddress?.state || "",
        postalCode: b.billingAddress?.postalCode || b.billingAddress?.postal || "00000", // <-- fix key
        country: b.billingAddress?.country || "N/A",
      },
      createdAt: new Date(),
    });

    await logActivity(req, {
      action: "charge.created",
      entity: "payment",
      entityId: invoiceNo,
      performedById: session.user?.id,
      performedByEmail: session.user?.email,
      details: {
        userId: String(userId),
        paymentId: String(payment._id),
        amountMinor: payment.amount,
        currency,
        description,
        status: payment.status,
      },
    });

    const amountMinor = payment.amount;
    const token = makeInvoiceToken(invoiceNo); // for invoice HTML/PDF links
    const ORIGIN = getOrigin(req);            // <-- always a valid http/https origin

    // Create Checkout Session (pay link)
    const sessionObj = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: userDoc?.stripeCustomerId || undefined,
      customer_email: userDoc?.email || email || undefined,
      // include session_id so UI can reconcile if webhook is delayed/missed
      success_url: `${ORIGIN}/admin/charges?paid=1&inv=${encodeURIComponent(invoiceNo)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${ORIGIN}/admin/charges?canceled=1&inv=${encodeURIComponent(invoiceNo)}&session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: false,
      metadata: { invoiceNo },
      payment_intent_data: { metadata: { invoiceNo } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amountMinor,
            product_data: { name: description },
          },
        },
      ],
    });

    await Payment.updateOne(
      { invoiceNo },
      { $set: { status: "pending", stripeCheckoutSessionId: sessionObj.id } as any }
    );

    await logActivity(req, {
      action: "paylink.created",
      entity: "payment",
      entityId: invoiceNo,
      performedById: session.user?.id,
      performedByEmail: session.user?.email,
      details: { checkoutSessionId: sessionObj.id },
    });

    // Email pay-now link (best effort)
    const toEmail = userDoc?.email || email;
    if (toEmail && sessionObj.url) {
      try {
        const html = buildPayNowHtml(
          { invoiceNo, amount: amountMinor, currency, description, checkoutUrl: sessionObj.url },
          ORIGIN,
          token
        );
        await sendMail(toEmail, `Payment requested for ${invoiceNo}`, html);

        await logActivity(req, {
          action: "email.sent",
          entity: "payment",
          entityId: invoiceNo,
          performedById: session.user?.id,
          performedByEmail: session.user?.email,
          details: { to: toEmail, template: "pay-now" },
        });
      } catch (e) {
        if (process.env.NODE_ENV !== "production") console.error("[sendMail paylink] error:", e);
      }
    }

    return res.status(201).json({ ok: true, data: { invoiceNo, status: "pending", payUrl: sessionObj.url } });
  } catch (err: any) {
    if (isDup(err)) {
      try {
        (req as any)._retries = ((req as any)._retries || 0) + 1;
        if ((req as any)._retries <= 1) return handler(req, res);
      } catch {}
    }
    return fail(res, 500, "Server error", err?.message || String(err));
  }
}
