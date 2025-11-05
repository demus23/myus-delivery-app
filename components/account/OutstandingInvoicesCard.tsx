// components/account/OutstandingInvoicesCard.tsx
import { useEffect, useState } from "react";

type Row = {
  invoiceNo: string;
  amount: number;
  currency: string;
  description?: string;
  createdAt?: string;
};

const fmt = (a: number, c: string) => `${c} ${(a / 100).toFixed(2)}`;

export default function OutstandingInvoicesCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/me/invoices?status=pending&limit=5", { credentials: "include" });
      const json = await r.json();
      if (json?.ok) setRows(json.data || []);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pay(invoiceNo: string) {
    const r = await fetch(`/api/me/paylink/${encodeURIComponent(invoiceNo)}`, { credentials: "include" });
    const json = await r.json();
    if (json?.ok && json.url) window.location.href = json.url;
    else alert(json?.error || "Failed to open payment");
  }

  return (
    <div className="card h-100">
      <div className="card-header fw-semibold">Outstanding Invoices</div>
      <div className="card-body">
        {busy && <div>Loading…</div>}
        {!busy && rows.length === 0 && <div className="text-muted">No outstanding invoices.</div>}
        {!busy && rows.length > 0 && (
          <ul className="list-unstyled mb-0">
            {rows.map((r) => (
              <li key={r.invoiceNo} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                  <div className="fw-semibold">{r.invoiceNo}</div>
                  <small className="text-muted">{r.description || "Charge"} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <strong>{fmt(r.amount, r.currency)}</strong>
                  <button className="btn btn-sm btn-primary" onClick={() => pay(r.invoiceNo)}>Pay</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
