// components/admin/TransactionHistoryCard.tsx
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Table, Badge } from "react-bootstrap";

type RecentRow = {
  invoiceNo: string;
  amount: number;            // minor units (e.g., 3300 = AED 33.00)
  currency: string;          // "AED"
  status: "succeeded" | "refunded";
  method?: { type?: string; brand?: string; last4?: string; label?: string };
  createdAt: string;
};

const fmtMoney = (minor: number, ccy: string) => `${ccy} ${(minor / 100).toFixed(2)}`;

function MethodCell({ r }: { r: RecentRow }) {
  const m = r.method || {};
  if (m.type === "card") return <span>{m.label || m.brand || "Card"} •••• {m.last4}</span>;
  if (m.type === "paypal") return <span>PayPal</span>;
  if (m.type === "wire") return <span>Wire</span>;
  return <span>—</span>;
}

export default function TransactionHistoryCard() {
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ ok: boolean; data: RecentRow[] }>(
          "admin/charges/recent",
          { params: { limit: 8 } } // show last 8 payments
        );
        if (data?.ok) setRows(data.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">Transaction History</div>
      <div className="card-body p-0">
        <Table hover responsive className="mb-0">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Invoice</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th style={{ width: 180 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center py-3">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="text-center py-3">No recent transactions</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.invoiceNo}>
                <td>
                  <a href={`/admin/charges?q=${encodeURIComponent(r.invoiceNo)}`}>
                    {r.invoiceNo}
                  </a>
                </td>
                <td>{fmtMoney(r.amount, r.currency)}</td>
                <td><MethodCell r={r} /></td>
                <td>
                  <Badge bg={r.status === "succeeded" ? "success" : "secondary"}>
                    {r.status}
                  </Badge>
                </td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
