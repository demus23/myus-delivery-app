// pages/api/webhooks/stripe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import Stripe from "stripe";

import dbConnect from "@/lib/dbConnect";
import { stripe } from "@/lib/stripe";
import { Activity } from "@/lib/models/Activity";
// IMPORTANT: adjust import based on your actual export:
import { Payment } from "@/lib/models/Payment"; // or: import Payment from "@/lib/models/Payment";

// 🆕 email utils
import { sendEmail } from "@/lib/email/resend";
import OrderConfirmationEmail from "@/emails/OrderConfirmation";

export const config = {
  api: { bodyParser: false }, // raw body for Stripe signature verification
};

// helpers
const fromStripeAmount = (amount: number | null | undefined) => (amount ?? 0) / 100;

/**
 * Try hard to find a customer email + line items given a PaymentIntent
 * - Prefer Checkout Session (more reliable for email + items)
 * - Fallback to PI/Charge billing email
 */

async function getEmailNameAndItemsFromPI(pi: Stripe.PaymentIntent): Promise<{
  email?: string;
  name?: string;
  items: { name: string; qty: number }[];
}> {
  let email: string | undefined =
    (pi.receipt_email as string | null) || undefined;
  let name: string | undefined;
  let items: { name: string; qty: number }[] = [];

  // 1) Try Checkout Session (email + line items)
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: pi.id,
      limit: 1,
    });
    const cs = sessions.data[0];
    if (cs) {
      email = email || cs.customer_details?.email || cs.customer_email || undefined;
      name = cs.customer_details?.name || name;

      try {
        const li = await stripe.checkout.sessions.listLineItems(cs.id);
        items = li.data.map((d) => ({
          name: d.description || "Item",
          qty: d.quantity || 1,
        }));
      } catch {}
    }
  } catch {}

  // 2) Fallback: Customer object
  if (!email && pi.customer && typeof pi.customer === "string") {
    try {
      const cust = await stripe.customers.retrieve(pi.customer);
      if (!("deleted" in cust)) {
        email = cust.email || email;
        name = cust.name || name;
      }
    } catch {}
  }

  // 3) Fallback: latest charge billing email
  if (!email && pi.latest_charge) {
    try {
      const chId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const ch = await stripe.charges.retrieve(chId);
      email = ch.billing_details?.email || email;
      name = name || ch.billing_details?.name || undefined;
    } catch {}
  }

  return { email, name, items };
}

async function resolveEmailAndItemsFromPI(pi: Stripe.PaymentIntent): Promise<{
  email?: string;
  items: { name: string; qty: number }[];
  customerName?: string;
}> {
  // 1) Try receipt_email on PI
  let email: string | undefined = (pi.receipt_email as string | null) || undefined;
  let customerName: string | undefined = undefined;
  let items: { name: string; qty: number }[] = [];

  // 2) Prefer Checkout Session (email + items)
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
    const cs = sessions.data[0];
    if (cs) {
      email = email || cs.customer_details?.email || cs.customer_email || undefined;
      customerName = cs.customer_details?.name || customerName;

      try {
        const li = await stripe.checkout.sessions.listLineItems(cs.id);
        items = li.data.map((d) => ({
          name: d.description || "Item",
          qty: d.quantity || 1,
        }));
      } catch {}
    }
  } catch {}

  // 3) Fallback: fetch Customer email/name
  if (!email && pi.customer && typeof pi.customer === "string") {
    try {
      const cust = await stripe.customers.retrieve(pi.customer);
      if (!("deleted" in cust)) {
        email = cust.email || email;
        customerName = cust.name || customerName;
      }
    } catch {}
  }

  // 4) Last resort: billing email from latest charge
  if (!email && pi.latest_charge) {
    try {
      const chId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
      const ch = await stripe.charges.retrieve(chId);
      email = ch.billing_details?.email || email;
      customerName = customerName || ch.billing_details?.name || undefined;
    } catch {}
  }

  return { email, items, customerName };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).send("Missing Stripe-Signature header");

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;

  try {
    const buf = await getRawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err: any) {
    console.error("[stripe webhook] signature verification failed:", err?.message || err);
    return res.status(400).send(`Webhook Error: ${err?.message || "invalid signature"}`);
  }

  // Connect DB once per request
  await dbConnect();

  try {
    switch (event.type) {
      /**
       * We chiefly rely on payment_intent.succeeded to mark invoices as paid.
       * checkout.session.* helps store session id and capture async flows.
       */
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const invoiceNo = (cs.metadata?.invoiceNo as string | undefined) || undefined;

        if (invoiceNo) {
          await Payment.updateOne(
            { invoiceNo },
            { $set: { stripeCheckoutSessionId: cs.id } }
          ).exec();

          await Activity.create({
            action:
              event.type === "checkout.session.completed"
                ? "paylink.completed"
                : "paylink.async_succeeded",
            entity: "payment",
            entityId: invoiceNo,
            details: { checkoutSessionId: cs.id, mode: cs.mode },
            createdAt: new Date(),
          });
        }
        break;
      }

      case "payment_intent.succeeded": {
  const pi = event.data.object as Stripe.PaymentIntent;

  // Optional: capture card/receipt details (unchanged from your code)
  let receiptUrl: string | undefined;
  let brand: string | undefined;
  let last4: string | undefined;

  if (pi.latest_charge) {
    const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
    const ch = await stripe.charges.retrieve(chargeId);
    receiptUrl = ch.receipt_url || undefined;
    const pmCard = ch.payment_method_details?.card;
    brand = pmCard?.brand || undefined;
    last4 = pmCard?.last4 || undefined;
  }

  const invoiceNo = (pi.metadata?.invoiceNo as string | undefined) || undefined;
  const orderId = invoiceNo ?? pi.id; // fallback so CLI fixtures still email

  // Update DB only when we actually have an invoiceNo
  if (invoiceNo) {
    await Payment.updateOne(
      { invoiceNo },
      {
        $set: {
          status: "succeeded",
          amountPaid: ((pi.amount_received ?? pi.amount ?? 0) / 100),
          currency: (pi.currency || "aed").toLowerCase(),
          method: { type: "card", brand, last4 },
          stripePaymentIntentId: pi.id,
          receiptUrl,
        } as any,
      }
    ).exec();

    await Activity.create({
      action: "payment.succeeded",
      entity: "payment",
      entityId: invoiceNo,
      details: { paymentIntentId: pi.id, receiptUrl },
      createdAt: new Date(),
    });
  }

  // Resolve email + items
  const { email, name, items } = await getEmailNameAndItemsFromPI(pi);

  console.log("[stripe webhook] about to send email", {
    orderId,
    to: email,
    hasInvoiceNo: !!invoiceNo,
    currency: (pi.currency || "AED").toUpperCase(),
    amount: (typeof pi.amount_received === "number"
      ? pi.amount_received
      : (typeof pi.amount === "number" ? pi.amount : 0)) / 100,
  });

  // Idempotency (use orderId so dev works without invoiceNo)
  const alreadySent = await Activity.exists({
    action: "email.order_confirmation.sent",
    entity: "payment",
    entityId: orderId,
  });

  if (!alreadySent && email) {
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const trackUrl = invoiceNo
      ? `${appUrl}/track?invoiceNo=${encodeURIComponent(invoiceNo)}`
      : `${appUrl}/track?pi=${encodeURIComponent(pi.id)}`;

    const amount =
      typeof pi.amount_received === "number"
        ? pi.amount_received / 100
        : typeof pi.amount === "number"
        ? pi.amount / 100
        : undefined;

    try {
      await sendEmail({
        to: email,
        subject: `Order #${orderId} confirmed`,
        from: "Cross Border Cart <no-reply@crossbordercart.com>", // force verified sender
        react: OrderConfirmationEmail({
          customerName: name,
          orderId,
          amount,
          currency: (pi.currency || "AED").toUpperCase(),
          items,
          trackUrl,
          brandName: "Cross Border Cart",
          brandUrl: "https://crossbordercart.com",
          supportEmail: "support@crossbordercart.com",
        }),
      });

      await Activity.create({
        action: "email.order_confirmation.sent",
        entity: "payment",
        entityId: orderId,
        details: { to: email, paymentIntentId: pi.id },
        createdAt: new Date(),
      });
    } catch (err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);

  console.error("[stripe webhook] order confirmation email error:", msg, err);
      // don't throw—still return 200
    }
  } else if (!email) {
    console.warn("[stripe webhook] no email found; skipping send", { orderId });
  }

  break;
}

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const invoiceNo = (pi.metadata?.invoiceNo as string | undefined) || undefined;
        if (!invoiceNo) break;

        await Payment.updateOne(
          { invoiceNo },
          {
            $set: {
              status: "failed",
              stripePaymentIntentId: pi.id,
              failureMessage: pi.last_payment_error?.message,
            } as any,
          }
        ).exec();

        await Activity.create({
          action: "payment.failed",
          entity: "payment",
          entityId: invoiceNo,
          details: {
            paymentIntentId: pi.id,
            error: pi.last_payment_error?.message,
            code: pi.last_payment_error?.code,
          },
          createdAt: new Date(),
        });

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        // Find invoiceNo from charge metadata or PI metadata
        let invoiceNo: string | undefined =
          (charge.metadata && (charge.metadata as any).invoiceNo) || undefined;

        if (!invoiceNo && typeof charge.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
            invoiceNo = (pi.metadata && (pi.metadata as any).invoiceNo) || invoiceNo;
          } catch {
            // ignore
          }
        }

        if (invoiceNo) {
          await Payment.updateOne(
            { invoiceNo },
            {
              $set: {
                status: "refunded",
                refundedAmount: fromStripeAmount(
                  (charge.amount_refunded ?? charge.amount) || 0
                ),
                refundedAt: new Date(),
                stripeRefundId: charge.refunds?.data?.[0]?.id,
              },
            }
          ).exec();

          await Activity.create({
            action: "refund.webhook",
            entity: "payment",
            entityId: invoiceNo,
            details: {
              chargeId: charge.id,
              amount_refunded: fromStripeAmount(charge.amount_refunded || 0),
            },
            createdAt: new Date(),
          });
        }
        break;
      }

      case "refund.created":
      case "refund.updated": {
        const refund = event.data.object as Stripe.Refund;

        // invoiceNo from refund metadata; else PI metadata
        let invoiceNo: string | undefined =
          (refund.metadata && (refund.metadata as any).invoiceNo) || undefined;

        if (!invoiceNo && typeof refund.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(refund.payment_intent);
            invoiceNo = (pi.metadata && (pi.metadata as any).invoiceNo) || invoiceNo;
          } catch {
            // ignore
          }
        }

        if (invoiceNo) {
          await Payment.updateOne(
            { invoiceNo },
            {
              $set: {
                status: "refunded",
                refundedAmount: fromStripeAmount(refund.amount || 0),
                refundedAt: new Date(),
                stripeRefundId: refund.id,
              },
            }
          ).exec();

          await Activity.create({
            action: "refund.webhook",
            entity: "payment",
            entityId: invoiceNo,
            details: {
              refundId: refund.id,
              amount: fromStripeAmount(refund.amount || 0),
              status: refund.status,
            },
            createdAt: new Date(),
          });
        }
        break;
      }

      default:
        // Optional: log other events for debugging
        // console.log("[stripe webhook] ignored event:", event.type);
        break;
    }

    // Always 200 so Stripe doesn’t retry unnecessarily
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] handler error:", err?.message || err);
    // Return 200 with warning; Stripe will consider delivered, and you can reprocess manually if needed.
    return res.status(200).json({ received: true, warning: err?.message || "handler error" });
  }
}
