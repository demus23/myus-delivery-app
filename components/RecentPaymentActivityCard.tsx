import { useEffect, useState } from "react";
import { Card, Badge } from "react-bootstrap";

type Row = {
  action: string;
  entityId?: string; // invoiceNo
  performedByEmail?: string | null;
  createdAt?: string;
  details?: any;
};

export default function RecentPaymentActivityCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/admin/activity?entity=payment&limit=5", { credentials: "include" });
        const j = await r.json();
        if (j?.ok) setRows(j.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="h-100">
      <Card.Header>Recent Payment Activity</Card.Header>
      <Card.Body>
        {loading && <div className="text-muted">Loading…</div>}
        {!loading && !rows.length && <div className="text-muted">No recent events.</div>}

        <ul className="list-unstyled mb-0">
          {rows.map((a, i) => (
            <li key={i} className="mb-2">
              <div>
                <Badge bg="light" text="dark" className="me-2">{a.action}</Badge>
                {a.entityId ? (
                  <a href={`/api/invoices/${encodeURIComponent(a.entityId)}?format=html`} target="_blank" rel="noreferrer">
                    {a.entityId}
                  </a>
                ) : "—"}
              </div>
              <small className="text-muted">
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""} • {a.performedByEmail || "system"}
              </small>
            </li>
          ))}
        </ul>
      </Card.Body>
      <Card.Footer className="text-end">
        <a href="/admin/activity">View all</a>
      </Card.Footer>
    </Card>
  );
}
