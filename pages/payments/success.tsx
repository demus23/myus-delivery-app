import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PaymentSuccess() {
  const router = useRouter();
  const { tx, session_id } = router.query as { tx?: string; session_id?: string };
  const [status, setStatus] = useState<"working" | "ok" | "failed">("working");

  useEffect(() => {
    if (!session_id) return;
    (async () => {
      try {
        const r = await fetch(`/api/payments/confirm?session_id=${encodeURIComponent(session_id)}${tx ? `&tx=${encodeURIComponent(tx)}` : ""}`);
        const d = await r.json();
        setStatus(d?.status === "succeeded" ? "ok" : "failed");
      } catch {
        setStatus("failed");
      }
    })();
  }, [session_id, tx]);

  return (
    <div style={{ maxWidth: 640, margin: "60px auto", padding: 24 }}>
      <h1>Payment</h1>
      {status === "working" && <p>Confirming your payment…</p>}
      {status === "ok" && (
        <>
          <p>✅ Payment confirmed.</p>
          <button onClick={() => router.push("/charges")}>Go to My Invoices/Charges</button>
        </>
      )}
      {status === "failed" && (
        <>
          <p>⚠️ We couldn’t confirm the payment just now.</p>
          <p>If the amount shows as paid in Stripe, the status will sync shortly via webhook.</p>
          <button onClick={() => router.push("/charges")}>Back</button>
        </>
      )}
    </div>
  );
}
