// components/account/BillingSummary.tsx
import { useEffect, useState } from "react";
import { Card, Table, Badge, Button } from "react-bootstrap";

type Bucket = { currency: string; gross: number; refunds: number; net: number; count: number };
type Recent = {
  invoiceNo: string; amount: number; currency: string;
  status: "succeeded" | "refunded"; description?: string; createdAt?: string;
};
type Resp = { ok: boolean; data: { byCurrency: Bucket[]; pendingCount: number; recent: Recent[] } };

const fmt = (minor: number, cur: string) => `${cur} ${(minor / 100).toFixed(2)}`;

export default function BillingSummary() {
  const [data, setData] = useState<Resp["data"] | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me/billing/summary", { credentials: "include" });
      const j: Resp = await r.json();
      if (j?.ok) setData(j.data);
    })();
  }, []);

  if (!data) return <Card><Card.Body>Loading billing…</Card.Body></Card>;

  return (
    <>
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">Billing summary</span>
          <div>
            <Button size="sm" variant="outline-secondary" href="/account/invoices">My Invoices</Button>{' '}
            <Button size="sm" variant="outline-secondary" href="/account/transactions">My Transactions</Button>
          </div>
        </Card.Header>
        <Table responsive className="mb-0">
          <thead>
            <tr>
              <th>Currency</th>
              <th>Paid</th>
              <th>Refunds</th>
              <th>Net</th>
              <th># Payments</th>
            </tr>
          </thead>
          <tbody>
            {data.byCurrency.map((b) => (
              <tr key={b.currency}>
                <td>{b.currency}</td>
                <td>{fmt(b.gross, b.currency)}</td>
                <td>{fmt(b.refunds, b.currency)}</td>
                <td className="fw-bold">{fmt(b.net, b.currency)}</td>
                <td>{b.count}</td>
              </tr>
            ))}
            {!data.byCurrency.length && (
              <tr><td colSpan={5} className="text-muted">No payments yet.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Card>
        <Card.Header className="fw-bold">
          Recent payments {data.pendingCount ? <Badge bg="warning" className="ms-2">{data.pendingCount} pending</Badge> : null}
        </Card.Header>
        <Table responsive className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Description</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ width: 160 }}>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.invoiceNo}>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                <td>{r.invoiceNo}</td>
                <td>{r.description || "Charge"}</td>
                <td>{fmt(r.amount, r.currency)}</td>
                <td><Badge bg={r.status === "succeeded" ? "success" : "secondary"}>{r.status}</Badge></td>
                <td>
                  <div className="d-flex gap-2">
                    <a className="btn btn-sm btn-outline-secondary"
                       href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=html`}
                       target="_blank" rel="noreferrer">View</a>
                    <a className="btn btn-sm btn-outline-secondary"
                       href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=pdf`} download>PDF</a>
                  </div>
                </td>
              </tr>
            ))}
            {!data.recent.length && (
              <tr><td colSpan={6} className="text-muted">No recent payments.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
