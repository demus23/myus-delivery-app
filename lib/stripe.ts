// lib/stripe.ts
import Stripe from "stripe";

const { STRIPE_SECRET_KEY } = process.env;
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}


export const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_ORIGIN ||
  "http://localhost:3000"; // sensible default for dev

// Use your Stripe account's default API version to avoid TS literal mismatches
export const stripe = new Stripe(STRIPE_SECRET_KEY);

/**
 * Prefer NEXT_PUBLIC_APP_ORIGIN (works client/server),
 * then APP_ORIGIN (server), then Vercel URL, then request Host, then localhost.
 * Always returns a fully-qualified origin with scheme.
 */
const ENV_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN ||
  process.env.APP_ORIGIN ||
  "";

export function getOrigin(req?: { headers?: Record<string, any> }) {
  if (ENV_ORIGIN) {
    return ENV_ORIGIN.startsWith("http") ? ENV_ORIGIN : `http://${ENV_ORIGIN}`;
  }
  const vercel = process.env.VERCEL_URL; // e.g., myapp.vercel.app
  if (vercel) return `https://${vercel}`;
  const host = req?.headers?.host;
  if (host) return host.startsWith("http") ? host : `http://${host}`;
  return "http://localhost:3000";
}

// Amount helpers
export const toStripeAmount = (amountMajor: number) => Math.round(amountMajor * 100);
export const fromStripeAmount = (amountMinor: number) => amountMinor / 100;

export type SupportedCurrency = "aed" | "usd" | "eur" | "gbp";

/**
 * Reusable Checkout Session creator
 * - amount is in MAJOR units (e.g., 49.99)
 * - currency must be one you’ve enabled in Stripe
 * - success/cancel URLs fall back to sensible defaults if omitted
 */
export async function createCheckoutSession(opts: {
  amount: number;
  currency: SupportedCurrency;
  invoiceNo?: string;
  userId?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string>;
  // Pass req to compute origin if you don't provide success/cancel
  req?: { headers?: Record<string, any> };
}) {
  const origin = opts.successUrl || opts.cancelUrl ? undefined : getOrigin(opts.req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    success_url:
      opts.successUrl ??
      `${origin}/pay/success?inv=${encodeURIComponent(opts.invoiceNo ?? "")}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      opts.cancelUrl ??
      `${origin}/pay/cancel?inv=${encodeURIComponent(opts.invoiceNo ?? "")}&session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: false,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.currency,
          product_data: {
            name: opts.invoiceNo ? `Invoice ${opts.invoiceNo}` : "Payment",
          },
          unit_amount: toStripeAmount(opts.amount),
        },
      },
    ],
    metadata: {
      ...(opts.metadata || {}),
      invoiceNo: opts.invoiceNo ?? "",
      userId: opts.userId ?? "",
      app: "myus-delivery",
      purpose: "checkout",
    },
    payment_intent_data: {
      metadata: {
        ...(opts.metadata || {}),
        invoiceNo: opts.invoiceNo ?? "",
        userId: opts.userId ?? "",
      },
    },
  });

  return session;
}
