import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api, getAxiosErrorMessage } from "@/lib/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import Head from "next/head";

type InvoiceRow = {
  invoiceNo: string;
  amount: number; // minor units (e.g., cents)
  currency: string; // e.g., "AED"
  status: "succeeded" | "pending" | "failed" | "refunded" | string;
  description?: string;
  createdAt: string; // ISO
  method?: {
    type?: "card" | "paypal" | "wire" | string;
    brand?: string;
    last4?: string;
    label?: string;
  } | null;
};

type ApiResp = { ok: true; data: InvoiceRow[] } | { ok: false; error: string };
type ErrorWithMessage = { message: string };
type APIError = { response?: { data?: { error?: string; message?: string } } };

const fmtAmount = (amountMinor: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "AED",
    }).format((amountMinor || 0) / 100);
  } catch {
    return `${currency || "AED"} ${(amountMinor || 0) / 100}`;
  }
};

const StatusBadge = ({ s }: { s: InvoiceRow["status"] }) => {
  const bg =
    s === "succeeded" ? "success" :
    s === "pending"   ? "warning" :
    s === "failed"    ? "danger"  :
    s === "refunded"  ? "secondary" : "info";
  return <Badge bg={bg} className="text-capitalize">{s}</Badge>;
};

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const e = err as Partial<ErrorWithMessage> & Partial<APIError>;
    const apiMsg = e.response?.data?.error ?? e.response?.data?.message;
    if (typeof apiMsg === "string" && apiMsg) return apiMsg;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Unknown error"; }
}

export default function MyInvoicesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [error, setError] = useState("");

  // UI filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | InvoiceRow["status"]>("");
const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get<ApiResp>("/invoices/me");
      if (!data.ok) throw new Error((data as any).error || "Failed to load");
      setRows((data as any).data || []);
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchesQ =
        !q ||
        r.invoiceNo.toLowerCase().includes(q.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(q.toLowerCase());
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [rows, q, statusFilter]);

  return (
    <>
      <Head><title>My Invoices</title></Head>

      <div className="container py-4">
        <h3 className="mb-3">My Invoices</h3>

        {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

        <Card className="shadow-sm">
          <Card.Body>
            {/* Filters */}
            <Row className="g-2 align-items-end mb-3">
              <Col md={6}>
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <Form.Control
                    placeholder="Invoice # or description"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Button variant="outline-secondary" onClick={() => setQ("")}>Clear</Button>
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="">All</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </Form.Select>
              </Col>
              <Col md={3} className="text-md-end">
                <Button onClick={load} disabled={loading}>
                  {loading ? <Spinner size="sm" /> : "Refresh"}
                </Button>
              </Col>
            </Row>

            {/* Table */}
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
  {loading ? (
    <tr><td colSpan={7}><Spinner size="sm" /> Loading…</td></tr>
  ) : filtered.length === 0 ? (
    <tr><td colSpan={7}>No invoices found.</td></tr>
  ) : (
    filtered.map((r) => (
      <tr key={r.invoiceNo}>
        <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
        <td>{r.invoiceNo}</td>
        <td className="text-truncate" style={{ maxWidth: 280 }}>
          {r.description || "—"}
        </td>
        <td>{fmtAmount(r.amount, r.currency)}</td>
        <td>
          {r.method?.type === "card"   && <span>Card {r.method.brand ? `(${r.method.brand})` : ""} •••• {r.method.last4 || ""}</span>}
          {r.method?.type === "paypal" && <span>PayPal {r.method.label || ""}</span>}
          {r.method?.type === "wire"   && <span>Wire {r.method.label || ""}</span>}
          {!r.method && "—"}
        </td>
        <td><StatusBadge s={r.status} /></td>
        <td>
          <div className="d-flex gap-2">
            <a
  href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=html&auto=1`}
  target="_blank"
  rel="noreferrer"
  className="btn btn-sm btn-outline-secondary"
>
  Print / Save PDF
</a>

         {r.status === "pending" && r.invoiceNo && (
  <button
    className="btn btn-sm btn-primary"
    disabled={payingId === r.invoiceNo}
    onClick={async () => {
      try {
        setPayingId(r.invoiceNo!);
        const { data } = await api.get<{ ok: boolean; url?: string; error?: string }>(
          `my/invoices/paylink/${encodeURIComponent(r.invoiceNo)}`
        );
        if (data?.ok && data.url) {
          window.location.href = data.url; // go to Checkout
        } else {
          alert(data?.error || "No pay link available");
        }
    } catch (err: unknown) {
  alert(getErrorMessage(err) || "Failed to open pay link");
} finally {
  setPayingId(null);
}

    }}
  >
    {payingId === r.invoiceNo ? "Opening…" : "Pay"}
  </button>
)}

            
          </div>
        </td>
      </tr>
    ))
  )}
</tbody>

            </Table>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
