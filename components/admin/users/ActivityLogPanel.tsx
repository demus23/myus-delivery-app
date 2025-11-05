import { useEffect, useState } from "react";
import { Card, Button, Spinner, Alert } from "react-bootstrap";

type ActivityItem = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy?: string | null;
  details?: any;
  createdAt: string;
};

export default function ActivityLogPanel({ userId }: { userId?: string }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function tryParse(jsonLike: string) {
    try { return JSON.parse(jsonLike); } catch { return null; }
  }

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      const text = await res.text();
      const payload = tryParse(text);

      if (!res.ok) {
        const msg = payload?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Accept several shapes: {items}, {logs}, {data}, or array
      const raw =
        (Array.isArray(payload?.items) && payload.items) ||
        (Array.isArray(payload?.logs) && payload.logs) ||
        (Array.isArray(payload?.data) && payload.data) ||
        (Array.isArray(payload) ? payload : []);

      // If 200 but unexpected body, don't error; just show empty list
      const norm: ActivityItem[] = raw.map((r: any, i: number) => ({
        id: String(r.id ?? r._id ?? i),
        action: String(r.action ?? r.type ?? "event"),
        entity: String(r.entity ?? r.target ?? "unknown"),
        entityId: r.entityId ? String(r.entityId) : undefined,
        performedBy: r.performedBy ?? r.actor ?? null,
        details: r.details ?? undefined,
        createdAt: r.createdAt
          ? new Date(r.createdAt).toISOString()
          : new Date().toISOString(),
      }));

      norm.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setItems(norm);
     } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load activity";
  setErr(msg); 
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Activity</strong>
        <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Refresh"}
        </Button>
      </Card.Header>
      <Card.Body>
        {err && <Alert variant="danger">{err}</Alert>}

        {!err && loading && (
          <div className="d-flex gap-2 align-items-center">
            <Spinner size="sm" /> <span>Loading…</span>
          </div>
        )}

        {!err && !loading && items.length === 0 && (
          <div className="text-muted">No activity yet.</div>
        )}

        {!err && !loading && items.length > 0 && (
          <ul className="list-group">
            {items.map((it) => (
              <li key={it.id} className="list-group-item">
                <div className="d-flex justify-content-between">
                  <div>
                    <code className="me-2">{it.action}</code>
                    <span>
                      <strong>{it.entity}</strong>
                      {it.entityId ? ` (${it.entityId})` : ""}
                    </span>
                    {it.performedBy && (
                      <span className="text-muted ms-2">by {it.performedBy}</span>
                    )}
                  </div>
                  <div className="text-muted small">
                    {new Date(it.createdAt).toLocaleString()}
                  </div>
                </div>
                {it.details && (
                  <pre className="small mb-0 mt-2 bg-light p-2 rounded">
                    {JSON.stringify(it.details, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}
