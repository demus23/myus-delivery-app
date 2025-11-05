// pages/api/admin/shipments/[id]/bill.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// ✅ Use absolute alias so we don't miscount ../ levels
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Schema, Types, model, models } from "mongoose";
import { Payment } from "@/lib/models/Payment";
import Shipping from "@/lib/models/Shipping";
import { stripe, APP_ORIGIN } from "@/lib/stripe";
import { Activity } from "@/lib/models/Activity";

type AdminSession = { user?: { id?: string; role?: string; email?: string } } | null;

// --- invoice counter utilities (same as charges/create) ---
type CounterDoc = { _id: string; seq: number };
const CounterSchema = new Schema<CounterDoc>(
  { _id: { type: String, required: true }, seq: { type: Number, required: true, default: 0 } },
  { collection: "invoice_counters", versionKey: false }
);
const InvoiceCounter =
  (models.InvoiceCounter as mongoose.Model<CounterDoc>) ||
  model<CounterDoc>("InvoiceCounter", CounterSchema);

function todayBase() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `INV-${yyyy}${mm}${dd}`;
}
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

const isAdmin = (s: AdminSession) =>
  s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  // ✅ Strongly type the session so TS knows about `user`
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });

  const id = String(req.query.id || "");
  const {
    amount,
    currency = "AED",
    description = "Shipment charge",
    collectMode = "link",
  } = (req.body || {}) as {
    amount: number | string;
    currency?: string;
    description?: string;
    collectMode?: "link" | "saved";
  };

  const amountMajor = Number(amount);
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    return res.status(400).json({ ok: false, error: "Amount must be > 0" });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db!;
    // 1) Shipment
    const ship: any = await Shipping.findById(id).lean();
    if (!ship) return res.status(404).json({ ok: false, error: "Shipment not found" });

    // 2) Resolve user/email
    let userId: Types.ObjectId | undefined = ship.user as Types.ObjectId | undefined;
    let email: string | undefined = ship.userEmail || ship.receiverEmail || ship.email;

    if (!email && userId) {
      const u = await db.collection("users").findOne(
        { _id: new Types.ObjectId(String(userId)) },
        { projection: { email: 1 } }
      );
      if (u?.email) email = String(u.email);
    }
    if (!userId && email) {
      const users = db.collection("users");
      const found = await users.findOne({ email });
      if (found?._id) userId = found._id as Types.ObjectId;
      else {
        const ins = await users.insertOne({
          email,
          name: (email as string).split("@")[0],
          emailVerified: null,
          createdAt: new Date(),
        } as any);
        userId = ins.insertedId as Types.ObjectId;
      }
    }
    if (!userId) return res.status(400).json({ ok: false, error: "Cannot resolve customer user" });

    // 3) Create invoice row (pending)
    const invoiceNo = await allocateInvoiceNo(db);
    const amountMinor = Math.round(amountMajor * 100);

    await Payment.create({
      invoiceNo,
      amount: amountMinor,
      currency: currency.toUpperCase(),
      description: `${description} (Shipment ${ship.tracking || ship._id})`,
      status: "pending",
      method: { type: "card", label: "Pay link" },
      user: userId,
      createdAt: new Date(),
    });

    // 4) Stripe Checkout session
    const cs = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amountMinor,
            product_data: { name: `Invoice ${invoiceNo}` },
          },
        },
      ],
      success_url: `${APP_ORIGIN}/admin/charges?paid=1&inv=${encodeURIComponent(invoiceNo)}`,
      cancel_url: `${APP_ORIGIN}/admin/charges?canceled=1&inv=${encodeURIComponent(invoiceNo)}`,
      metadata: { invoiceNo, shipmentId: String(ship._id) },
      payment_intent_data: { metadata: { invoiceNo, shipmentId: String(ship._id) } },
    });

    await Payment.updateOne({ invoiceNo }, { $set: { stripeCheckoutSessionId: cs.id } });

    // 5) Activity (✅ cast session when reading .user)
    try {
      await Activity.create({
        action: "charge.created",
        entity: "payment",
        entityId: invoiceNo,
        performedBy:
          (session?.user?.id && Types.ObjectId.isValid(String(session.user.id)))
            ? new Types.ObjectId(String(session.user.id))
            : undefined,
        performedByEmail: session?.user?.email,
        details: {
          amount: amountMinor,
          currency: currency.toUpperCase(),
          shipmentId: String(ship._id),
          tracking: ship.tracking || null,
          checkoutSessionId: cs.id,
        },
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn("[activity] charge.created failed:", e);
    }

    return res.status(201).json({
      ok: true,
      invoiceNo,
      checkoutUrl: cs.url,
      status: "pending",
    });
  } catch (err: any) {
    console.error("bill shipment error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}
