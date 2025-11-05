import { Alert, Button } from "react-bootstrap";
import Link from "next/link";

export default function ShipmentsNewDisabled() {
  const enabled = process.env.NEXT_PUBLIC_SHIPMENTS_ENABLED === "true" || process.env.SHIPMENTS_ENABLED === "true";
  if (enabled) {
    return (
      <div className="container py-4">
        <Alert variant="warning">
          Shipment creation is currently in pilot and not available in this build.
        </Alert>
        <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }
  return (
    <div className="container py-4">
      <Alert variant="light" className="border">
        <h5 className="mb-2">Shipment creation is coming soon</h5>
        <div>For now, please use the Shipping Calculator to view estimates.</div>
        <div className="mt-3">
          <Link href="/dashboard" className="btn btn-outline-secondary me-2">Dashboard</Link>
          <a href="#shipping-calculator" className="btn btn-primary">Open Calculator</a>
        </div>
      </Alert>
    </div>
  );
}
