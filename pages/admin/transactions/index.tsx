import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Table, Form, Row, Col, InputGroup, Button, Pagination, Badge,
} from "react-bootstrap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

type RowT = {
  invoiceNo: string;
  amount: number; // minor (fils)
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method?: { type?: string; brand?: string; last4?: string; label?: string };
  description?: string;
  createdAt?: string;
  userDoc?: { name?: string; email?: string };
};

type Resp = {
  ok: boolean;
  data: RowT[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const fmt = (aMinor: number, c: string) => `${c} ${(aMinor / 100).toFixed(2)}`;

export default function AdminTransactionsPage() {
  useSession();
  const router = useRouter();

  const [rows, setRows] = useState<RowT[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");

  const load = async () => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    if (q) qs.set("q", q);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (method) qs.set("method", method);
    // transactions are succeeded/refunded by default
    const r = await fetch(`/api/admin/transactions?${qs}`, { credentials: "include" });
    const j: Resp = await r.json();
    if (j?.ok) {
      setRows(j.data || []);
      setPages(j.pages || 1);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, from, to, method]);

  return (
    <AdminLayout title="Transactions">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="m-0">Transactions</h2>
      </div>

      <Row className="align-items-end mb-3">
        <Col md={4}>
          <Form.Label>Search</Form.Label>
          <InputGroup>
            <Form.Control placeholder="Invoice # / Description / Email" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button onClick={() => setPage(1)}>Go</Button>
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Label>From</Form.Label>
          <Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Col>
        <Col md={2}>
          <Form.Label>To</Form.Label>
          <Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Col>
        <Col md={2}>
          <Form.Label>Method</Form.Label>
          <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="paypal">PayPal</option>
            <option value="wire">Wire</option>
          </Form.Select>
        </Col>
      </Row>

      <Table hover responsive>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th style={{ width: 180 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.invoiceNo}>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
              <td>{r.invoiceNo}</td>
              <td>
                <div>{r.userDoc?.name || "—"}</div>
                <small className="text-muted">{r.userDoc?.email}</small>
              </td>
              <td>{fmt(r.amount, r.currency)}</td>
              <td>
                {r?.method?.type === "card" && (r.method?.label || r.method?.brand) ? (
                  <span>{r.method?.label || r.method?.brand} {r.method?.last4 ? `•••• ${r.method.last4}` : ""}</span>
                ) : r?.method?.type ? (
                  <span>{r.method.type.toUpperCase()}</span>
                ) : "—"}
              </td>
              <td>
                <Badge bg={r.status === "succeeded" ? "success" : r.status === "refunded" ? "secondary" : "warning"}>
                  {r.status}
                </Badge>
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
                  >
                    PDF
                  </a>
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={7} className="text-muted">No transactions.</td>
            </tr>
          )}
        </tbody>
      </Table>

      <div className="d-flex justify-content-center">
        <Pagination className="mb-0">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Next disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} />
        </Pagination>
      </div>
    </AdminLayout>
  );
}
