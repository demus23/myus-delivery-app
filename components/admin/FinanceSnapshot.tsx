// components/admin/FinanceSnapshot.tsx
import { useEffect, useState } from "react";
import { Card, Table, Badge } from "react-bootstrap";

type Bucket = { currency: string; gross: number; refunds: number; net: number; count: number };
type RecentRow = {
  invoiceNo: string;
  amount: number;
  currency: string;
  status: "succeeded" | "refunded";
  description?: string;
  method?: { type?: string; label?: string; brand?: string; last4?: string };
  createdAt?: string;
  userDoc?: { name?: string; email?: string };
};
type Resp = { ok: boolean; data: { today: Bucket[]; last7d: Bucket[]; mtd: Bucket[]; ytd: Bucket[]; recent: RecentRow[] } };

const fmt = (minor: number, cur: string) => `${cur} ${(minor / 100).toFixed(2)}`;

function BucketTable({ title, rows }: { title: string; rows: Bucket[] }) {
  return (
    <Card className="mb-3">
      <Card.Header className="fw-bold">{title}</Card.Header>
      <Table responsive className="mb-0">
        <thead>
          <tr>
            <th>Currency</th>
            <th>Gross</th>
            <th>Refunds</th>
            <th>Net</th>
            <th>#</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r) => (
            <tr key={r.currency}>
              <td>{r.currency}</td>
              <td>{fmt(r.gross, r.currency)}</td>
              <td>{fmt(r.refunds, r.currency)}</td>
              <td className="fw-bold">{fmt(r.net, r.currency)}</td>
              <td>{r.count}</td>
            </tr>
          ))}
          {!rows?.length && (
            <tr><td colSpan={5} className="text-muted">No data</td></tr>
          )}
        </tbody>
      </Table>
    </Card>
  );
}

export default function FinanceSnapshot() {
  const [data, setData] = useState<Resp["data"] | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/transactions/summary", { credentials: "include" });
      const j: Resp = await r.json();
      if (j?.ok) setData(j.data);
    })();
  }, []);

  if (!data) return <Card><Card.Body>Loading finance snapshot…</Card.Body></Card>;

  return (
    <>
      <div className="row">
        <div className="col-md-6"><BucketTable title="Today" rows={data.today} /></div>
        <div className="col-md-6"><BucketTable title="Last 7 days" rows={data.last7d} /></div>
      </div>
      <div className="row">
        <div className="col-md-6"><BucketTable title="Month to date" rows={data.mtd} /></div>
        <div className="col-md-6"><BucketTable title="Year to date" rows={data.ytd} /></div>
      </div>

      <Card>
        <Card.Header className="fw-bold">Recent payments</Card.Header>
        <Table responsive className="mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data.recent || []).map((r) => (
              <tr key={r.invoiceNo}>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                <td>{r.invoiceNo}</td>
                <td>
                  <div>{r.userDoc?.name || "—"}</div>
                  <small className="text-muted">{r.userDoc?.email}</small>
                </td>
                <td>{fmt(r.amount, r.currency)}</td>
                <td>
                  {r?.method?.label || r?.method?.brand || r?.method?.type?.toUpperCase() || "—"}
                  {r?.method?.last4 ? ` •••• ${r.method.last4}` : ""}
                </td>
                <td><Badge bg={r.status === "succeeded" ? "success" : "secondary"}>{r.status}</Badge></td>
              </tr>
            ))}
            {!data.recent?.length && (
              <tr><td colSpan={6} className="text-muted">No recent payments.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
