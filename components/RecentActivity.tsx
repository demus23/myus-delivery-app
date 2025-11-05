import { useEffect, useState } from "react";
import { Card, Table, Badge, Spinner } from "react-bootstrap";
import { api } from "@/lib/api";

type Item = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  performedByEmail?: string | null;
  createdAt: string;
};

export default function RecentActivity({ limit = 10 }: { limit?: number }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.get<{ ok: boolean; data: Item[] }>("admin/activity", {
          params: { page: 1, limit },
        });
        if (r.data?.ok) setRows(r.data.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return (
    <Card className="mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <strong>Recent Activity</strong>
        {loading && <Spinner size="sm" />}
      </Card.Header>
      <Card.Body className="p-0">
        <Table hover responsive className="mb-0">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td><Badge bg="info">{r.action}</Badge></td>
                <td>{r.entity}{r.entityId ? ` · ${r.entityId}` : ""}</td>
                <td>{r.performedByEmail || "—"}</td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={4} className="text-muted">Nothing yet.</td></tr>
            )}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
