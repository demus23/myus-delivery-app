import { useEffect, useState } from "react";
import { Table, Form, InputGroup, Button, Badge } from "react-bootstrap";
import { useSession } from "next-auth/react";

type Row = {
  invoiceNo: string;
  amount: number;      // minor units
  currency: string;
  status: "succeeded" | "refunded";
  method?: { type?: string; brand?: string; last4?: string; label?: string };
  description?: string;
  createdAt?: string;
};

const fmt = (a: number, c: string) => `${c} ${(a / 100).toFixed(2)}`;

export default function MyTransactionsPage() {
  useSession();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const url = q ? `/api/me/transactions?q=${encodeURIComponent(q)}` : "/api/me/transactions";
      const r = await fetch(url, { credentials: "include" });
      const json = await r.json();
      if (json?.ok) setRows(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>My Transactions</h1>

      <div style={{ marginBottom: 16 }}>
        <InputGroup>
          <Form.Control
            placeholder="Search invoice # / description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={load} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </InputGroup>
      </div>

      <Table hover responsive>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice</th>
            <th>Description</th>
            <th>Total</th>
            <th>Status</th>
            <th style={{ width: 160 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.invoiceNo}>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
              <td>{r.invoiceNo}</td>
              <td>{r.description || "Charge"}</td>
              <td>{fmt(r.amount, r.currency)}</td>
              <td>
                <Badge bg={r.status === "succeeded" ? "success" : "secondary"}>{r.status}</Badge>
              </td>
              <td>
                <div className="d-flex gap-2">
                  <a
                    className="btn btn-sm btn-outline-secondary"
                    href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=html`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                  <a
                    className="btn btn-sm btn-outline-secondary"
                    href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=pdf`}
                    download
                  >
                    PDF
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr>
              <td colSpan={6} className="text-muted">No transactions yet.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
