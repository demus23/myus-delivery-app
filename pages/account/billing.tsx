import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CardForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [last4, setLast4] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function loadMe() {
    const r = await fetch("/api/billing/me", { credentials: "include" });
    const j = await r.json();
    if (j?.ok && j.hasCardOnFile) {
      setBrand(j.brand || null);
      setLast4(j.last4 || null);
    } else {
      setBrand(null);
      setLast4(null);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setMessage("");

    try {
      // 1) Get SetupIntent client_secret
      const ci = await fetch("/api/billing/create-setup-intent", { method: "POST" });
      const { ok, clientSecret, error } = await ci.json();
      if (!ok) throw new Error(error || "Failed to create setup intent");

      // 2) Confirm on client with the CardElement
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Card confirmation failed");
      }

      const pmId = (result.setupIntent?.payment_method || "") as string;
      if (!pmId) throw new Error("No payment_method from SetupIntent");

      // 3) Save as default on server
      const save = await fetch("/api/billing/save-default-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      const sj = await save.json();
      if (!sj?.ok) throw new Error(sj?.error || "Failed to save default method");

      setMessage("Card saved.");
      setBrand(sj.brand || null);
      setLast4(sj.last4 || null);
    } catch (err: any) {
      setMessage(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 24 }}>
      <h1>Billing</h1>
      <p className="text-muted">
        {brand && last4 ? (
          <>Default card: <strong>{brand}</strong> •••• {last4}</>
        ) : (
          <>No card on file.</>
        )}
      </p>

      <form onSubmit={saveCard}>
        <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <CardElement options={{ hidePostalCode: true }} />
        </div>
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            background: "#0ea5a2", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 14px", cursor: "pointer"
          }}
        >
          {loading ? "Saving..." : "Save card"}
        </button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Elements stripe={stripePromise}>
      <CardForm />
    </Elements>
  );
}
