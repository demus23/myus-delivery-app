import { useEffect, useState } from "react";
import { Table, Badge } from "react-bootstrap";
import { useSession } from "next-auth/react";

type Row = {
  action: string;
  entity: string;
  entityId?: string;        // invoiceNo
  performedByEmail?: string;
  details?: any;
  createdAt?: string;
};

export default function MyActivityPage() {
  useSession(); // ensure cookie
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me/activity", { credentials: "include" });
      const j = await r.json();
      if (j?.ok) setRows(j.data || []);
    })();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 className="mb-3">My Activity</h1>

      <Table hover responsive>
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Invoice</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={i}>
              <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
              <td><Badge bg="light" text="dark">{a.action}</Badge></td>
              <td>
                {a.entityId ? (
                  <a href={`/api/invoices/${encodeURIComponent(a.entityId)}?format=html`} target="_blank" rel="noreferrer">
                    {a.entityId}
                  </a>
                ) : "—"}
              </td>
              <td><code style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(a.details || {}, null, 2)}</code></td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={4} className="text-muted">No activity yet.</td></tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
