// pages/api/admin/packages/[id]/bill.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose, { Types } from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { stripe } from "@/lib/stripe";
import { Activity } from "@/lib/models/Activity";

type AdminSession = { user?: { id?: string; role?: string; email?: string } } | null;

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";
const isObjectId = (id: string) => Types.ObjectId.isValid(id);

function baseUrlFromReq(req: NextApiRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function todayBase() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `INV-${yyyy}${mm}${dd}`;
}

async function nextInvoiceNo(db: mongoose.mongo.Db): Promise<string> {
  const base = todayBase();
  const start = `${base}-0000`, end = `${base}-9999`;
  const doc = await db
    .collection<{ invoiceNo: string }>("payments")
    .find({ invoiceNo: { $gte: start, $lte: end } }, { projection: { invoiceNo: 1 } })
    .sort({ invoiceNo: -1 })
    .limit(1)
    .next();

  const last = doc?.invoiceNo?.match(/-(\d{4})$/)?.[1];
  const n = last ? parseInt(last, 10) + 1 : 1;
  return `${base}-${String(n).padStart(4, "0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as AdminSession;
  if (!session || !isAdmin(session)) return res.status(403).json({ ok: false, error: "Forbidden" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  const id = String(req.query.id || "");
  if (!isObjectId(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const { amount, currency = "AED", description = "Shipment charge" } = (req.body as any) || {};
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ ok: false, error: "Amount must be > 0" });

  try {
    await dbConnect();
    const db = mongoose.connection.db!;
    const _id = new Types.ObjectId(id);

    // Load the package (we use raw collection to avoid model-path issues)
    const pkg = await db.collection("packages").findOne<{ user?: any; userEmail?: string; suiteId?: string }>(
      { _id },
      { projection: { user: 1, userEmail: 1, suiteId: 1 } }
    );
    if (!pkg) return res.status(404).json({ ok: false, error: "Package not found" });

    // Resolve user id/email
    let userId: Types.ObjectId | undefined;
    let email: string | undefined;

    if (pkg.user && Types.ObjectId.isValid(String(pkg.user))) {
      userId = new Types.ObjectId(String(pkg.user));
      const u = await db.collection("users").findOne<{ email?: string }>({ _id: userId }, { projection: { email: 1 } });
      email = u?.email || pkg.userEmail;
    } else if (pkg.userEmail) {
      email = String(pkg.userEmail);
      const u = await db.collection("users").findOne<{ _id: Types.ObjectId }>({ email });
      if (u?._id) userId = u._id;
    }

    // If still no user, create a shell user by email (optional)
    if (!userId && email) {
      const ins = await db.collection("users").insertOne({
        email,
        name: email.split("@")[0],
        emailVerified: null,
        createdAt: new Date(),
      } as any);
      userId = ins.insertedId as Types.ObjectId;
    }

    if (!userId) return res.status(400).json({ ok: false, error: "Could not resolve user for this package" });

    const invoiceNo = await nextInvoiceNo(db);
    const amountMinor = Math.round(amt * 100);
    const appBase = baseUrlFromReq(req);

    // Create a Stripe Checkout Session (pay link)
    const cs = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${appBase}/account/invoices?paid=${encodeURIComponent(invoiceNo)}`,
      cancel_url: `${appBase}/admin/packages?cancel=${encodeURIComponent(invoiceNo)}`,
      metadata: { invoiceNo, packageId: id },
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
      payment_intent_data: { metadata: { invoiceNo, packageId: id } },
    });

    // Create/Upsert the Payment row as pending
    await Payment.updateOne(
      { invoiceNo },
      {
        $set: {
          invoiceNo,
          user: userId,
          amount: amountMinor,
          currency: currency.toUpperCase(),
          description,
          status: "pending",
          method: { type: "card", label: "Checkout link" },
          stripeCheckoutSessionId: cs.id,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Activity log
    try {
      await Activity.create({
        action: "charge.created",
        entity: "payment",
        entityId: invoiceNo,
        performedBy: new Types.ObjectId(String(session.user?.id)),
        performedByEmail: session.user?.email,
        details: { packageId: id, amount: amountMinor, currency, description },
        createdAt: new Date(),
      });
    } catch {}

    return res.status(200).json({ ok: true, invoiceNo, checkoutUrl: cs.url });
  } catch (err: any) {
    console.error("[packages/bill] error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}
