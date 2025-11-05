import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Table,
  Row,
  Col,
  Form,
  InputGroup,
  Button,
  Badge,
  Pagination,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { api } from "@/lib/api";

type Item = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  performedBy?: string | null;
  performedByEmail?: string | null;
  details?: any;
  createdAt: string; // ISO
};

type ListResp = {
  ok: boolean;
  data: Item[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const short = (v: any, len = 80) => {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > len ? s.slice(0, len) + "…" : s;
  } catch {
    return "";
  }
};

export default function AdminActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const canView = (role?: any) =>
    role === "admin" || role === "superadmin";

  useEffect(() => {
    if (status === "loading") return;
    const role = (session?.user as any)?.role;
    if (!canView(role)) {
      router.replace("/login");
    }
  }, [status, session, router]);

  const load = async () => {
    const params: any = { page, q };
    if (entity) params.entity = entity;
    if (action) params.action = action;
    if (userId) params.userId = userId;
    if (from) params.from = from;
    if (to) params.to = to;

    const r = await api.get<ListResp>("admin/activity", { params });
    if (r.data?.ok) {
      setItems(r.data.data || []);
      setPages(r.data.pages || 1);
    }
  };

  // reflect filters in URL (shallow)
  useEffect(() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (entity) qs.set("entity", entity);
    if (action) qs.set("action", action);
    if (userId) qs.set("userId", userId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    router.replace(`/admin/activity${qs.toString() ? `?${qs}` : ""}`, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, entity, action, userId, from, to]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, entity, action, userId, from, to]);

  const headerHint = useMemo(
    () => (
      <small className="text-muted">
        Filter by <code>entity</code> (e.g. <em>payment</em>, <em>package</em>),{" "}
        <code>action</code> (e.g. <em>charge.created</em>), date range, user id/email, or free text.
      </small>
    ),
    []
  );

  return (
    <AdminLayout title="Activity">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h2 className="mb-0">Activity</h2>
        {headerHint}
      </div>

      <Row className="align-items-end g-3 mb-3">
        <Col md={3}>
          <Form.Label>Search</Form.Label>
          <InputGroup>
            <Form.Control
              placeholder="action/entity/email/text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <Button onClick={() => setPage(1)}>Go</Button>
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Label>Entity</Form.Label>
          <Form.Control
            placeholder="payment / package"
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col md={2}>
          <Form.Label>Action</Form.Label>
          <Form.Control
            placeholder="charge.created"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col md={2}>
          <Form.Label>User ID / Email</Form.Label>
          <Form.Control
            placeholder="ObjectId or email"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
          />
        </Col>
        <Col md={1}>
          <Form.Label>From</Form.Label>
          <Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Col>
        <Col md={1}>
          <Form.Label>To</Form.Label>
          <Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Col>
        <Col md="auto">
          <Button variant="outline-secondary" onClick={() => {
            setQ(""); setEntity(""); setAction(""); setUserId(""); setFrom(""); setTo(""); setPage(1);
          }}>
            Clear
          </Button>
        </Col>
      </Row>

      <Table hover responsive>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Entity ID</th>
            <th>By</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td>{new Date(it.createdAt).toLocaleString()}</td>
              <td><Badge bg="info">{it.action}</Badge></td>
              <td>{it.entity}</td>
              <td><code>{it.entityId || "—"}</code></td>
              <td>
                {it.performedByEmail || "—"}
                {it.performedBy && (
                  <>
                    <br />
                    <small className="text-muted">{it.performedBy}</small>
                  </>
                )}
              </td>
              <td>
                {it.details ? (
                  <OverlayTrigger
                    placement="left"
                    overlay={<Tooltip style={{ maxWidth: 420 }}>
                      <pre className="m-0" style={{ whiteSpace: "pre-wrap" }}>
                        {typeof it.details === "string" ? it.details : JSON.stringify(it.details, null, 2)}
                      </pre>
                    </Tooltip>}
                  >
                    <span style={{ cursor: "help" }}>{short(it.details)}</span>
                  </OverlayTrigger>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr><td colSpan={6} className="text-muted">No activity found.</td></tr>
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
