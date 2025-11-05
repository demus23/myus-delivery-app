import { useRouter } from "next/router";
import { useState } from "react";

type Quote = {
  carrier: string;
  service: string;
  etaDays?: number | null;
  priceAED?: number | null;
};

type Props = {
  from: string;                 // e.g. "United Arab Emirates"
  to: string;                   // e.g. "United Kingdom"
  postcode?: string;            // optional
  weightKg: number;             // e.g. 1
  dimsCm?: { l?: number; w?: number; h?: number } | null;
  speed: "standard" | "express";
  currency?: string;            // default "AED"
  quotes: Quote[];              // the quotes you already fetched
};

export default function QuotesProceedList({
  from,
  to,
  postcode,
  weightKg,
  dimsCm,
  speed,
  currency = "AED",
  quotes,
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function proceed(q: Quote) {
    setError(null);
    setBusyId(`${q.carrier}-${q.service}`);
    try {
      const r = await fetch("/api/shipments/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          postcode,
          weightKg,
          dimsCm,
          speed,
          currency,
          quote: q, // { carrier, service, etaDays, priceAED }
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || "Create failed");
      }
      // go straight to the created shipment page
      router.push(`/shipments/${data.id}`);
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Create failed";
  setError(msg);
}
  }

  return (
    <div>
      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {quotes.length === 0 ? (
        <div className="alert alert-info">No quotes for this request.</div>
      ) : (
        quotes.map((q) => {
          const key = `${q.carrier}-${q.service}`;
          return (
            <div
              key={key}
              className="d-flex align-items-center justify-content-between border rounded p-2 mb-2"
            >
              <div>
                <strong>{q.carrier}</strong> • {q.service}
                {q.etaDays != null && (
                  <span className="ms-2 text-muted">{q.etaDays} days</span>
                )}
              </div>

              <div className="d-flex align-items-center gap-2">
                <div className="fw-bold">
                  {(q.priceAED ?? 0).toFixed(2)} AED
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busyId === key}
                  onClick={() => proceed(q)}
                >
                  {busyId === key ? "Creating…" : "Proceed"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
