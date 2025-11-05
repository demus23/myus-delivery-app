// pages/account/invoices.tsx
import { useEffect, useState } from "react";
import { Table, Form, InputGroup, Button, Badge } from "react-bootstrap";
import { useSession } from "next-auth/react";

type Row = {
  invoiceNo: string;
  amount: number;      // minor units
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method?: { type?: string };
  description?: string;
  createdAt?: string;
};

const fmt = (a: number, c: string) => `${c} ${(a / 100).toFixed(2)}`;

export default function MyInvoicesPage() {
  useSession(); // ensure auth cookie
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const url = q ? `/api/me/invoices?q=${encodeURIComponent(q)}` : "/api/me/invoices";
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

  async function pay(invoiceNo: string) {
    try {
      const r = await fetch(`/api/me/paylink/${encodeURIComponent(invoiceNo)}`, { credentials: "include" });
      const json = await r.json();
      if (json?.ok && json.url) {
        window.location.href = json.url; // open Checkout
      } else {
        alert(json?.error || "No pay link available");
      }
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to open pay link";
  alert(msg);
   }
  }

  async function openPortal() {
    try {
      setPortalBusy(true);
      const r = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const json = await r.json();
      setPortalBusy(false);
      if (json?.ok && json.url) {
        window.location.href = json.url;
      } else {
        alert(json?.error || "Could not open billing portal");
      }
    } catch (e: unknown) {
      setPortalBusy(false);
       const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Could not open billing portal";
  alert(msg);
      
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="mb-2">My Invoices</h1>
        <Button size="sm" variant="outline-secondary" onClick={openPortal} disabled={portalBusy}>
          {portalBusy ? "Opening…" : "Manage payment methods"}
        </Button>
      </div>

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
            <th style={{ width: 220 }}>Actions</th>
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
                <Badge
                  bg={
                    r.status === "succeeded"
                      ? "success"
                      : r.status === "pending"
                      ? "warning"
                      : r.status === "failed"
                      ? "danger"
                      : "secondary"
                  }
                >
                  {r.status}
                </Badge>
              </td>
              <td>
                <div className="d-flex gap-2">
                  {r.status === "pending" ? (
                    <button className="btn btn-sm btn-primary" onClick={() => pay(r.invoiceNo)}>
                      Pay
                    </button>
                  ) : (
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={`/api/invoices/${encodeURIComponent(r.invoiceNo)}?format=html`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Receipt
                    </a>
                  )}
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
              <td colSpan={6} className="text-muted">
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
