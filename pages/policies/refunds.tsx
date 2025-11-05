// pages/policies/refunds.tsx
export default function RefundsPolicyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
      <h1>Refunds Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <p>
        Outline your refund/return process, eligibility, timelines, and exceptions here.
      </p>
    </main>
  );
}
