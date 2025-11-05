// pages/policies/shipping.tsx
export default function ShippingPolicyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
      <h1>Shipping Policy</h1>
      <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
      <p>
        Describe shipping methods, fees, handling times, coverage, and tracking here.
      </p>
    </main>
  );
}
