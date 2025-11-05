// components/ShippingCalcWidget.tsx
import { useState } from "react";
import { Button, Table, Spinner, Alert } from "react-bootstrap";

type Addr = { country: string; city: string; postcode?: string };
type Dims = { l: number; w: number; h: number };
type Option = {
  carrier: "DHL" | "Aramex" | "UPS";
  service: "standard" | "express";
  transitDays: number;
  totalPriceAED: number;
};

type Props = {
  fromDefault?: Addr;
  toDefault?: Addr;
  weightDefault?: number;
  dimsDefault?: Dims;
  express?: boolean;
  /** set true only if you want the widget to render its own heading */
  showTitle?: boolean;
};

export default function ShippingCalcWidget({
  fromDefault = { country: "UAE", city: "Dubai", postcode: "" },
  toDefault = { country: "GB", city: "London", postcode: "SW1A1AA" },
  weightDefault = 2.5,
  dimsDefault = { l: 30, w: 25, h: 15 },
  express = false,
  showTitle = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Option[]>([]);
  const [cheapest, setCheapest] = useState<number | null>(null);

  const getQuotes = async () => {
    setLoading(true);
    setError(null);
    setRows([]);
    setCheapest(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromDefault,
          to: toDefault,
          weightKg: weightDefault,
          dimsCm: dimsDefault,
          express,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(data.options || []);
      setCheapest(
        typeof data.cheapestIndex === "number" ? data.cheapestIndex : null
      );
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to get quotes";
  setError(msg);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      {showTitle && <h6 className="fw-semibold mb-3">Shipping Calculator</h6>}

      <div className="d-flex align-items-center justify-content-between mb-2">
        <Button variant="dark" size="sm" onClick={getQuotes} disabled={loading}>
          {loading ? <Spinner size="sm" animation="border" /> : "Get Quotes"}
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="py-1 px-2 mb-2">
          {error}
        </Alert>
      )}

      {rows.length > 0 ? (
        <Table hover responsive size="sm" className="mb-0">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Service</th>
              <th>ETA</th>
              <th className="text-end">Price (AED)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={i} className={i === cheapest ? "table-success" : undefined}>
                <td>{o.carrier}</td>
                <td className="text-capitalize">{o.service}</td>
                <td>{o.transitDays} days</td>
                <td className="text-end">
                  {o.totalPriceAED.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        !loading && (
          <div className="text-muted small">Click “Get Quotes” to load sample rates.</div>
        )
      )}
    </div>
  );
}
