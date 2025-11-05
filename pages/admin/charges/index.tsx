import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Table,
  Form,
  Row,
  Col,
  InputGroup,
  Button,
  Pagination,
  Badge,
  Dropdown,
  ButtonGroup,
  ToggleButton,
  Modal,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { useRouter } from "next/router";

type ChargeRow = {
  invoiceNo?: string;
  _id?: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method?: { type: "card" | "paypal" | "wire"; brand?: string; last4?: string; label?: string };
  description?: string;
  createdAt?: string;
  userDoc?: { name?: string; email?: string };
};

type ListResp = {
  ok: boolean;
  data: ChargeRow[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const fmt = (aMinor: number, c: string) => `${c} ${(aMinor / 100).toFixed(2)}`;
const VIEW_PAYMENTS = "payments";
const VIEW_INVOICES = "invoices";

export default function AdminChargesPage() {
  useSession();
  const router = useRouter();

  // -------- listing / filters ----------
  const initialView = typeof router.query.view === "string" ? router.query.view : VIEW_INVOICES;
  const [view, setView] = useState<string>(initialView);
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  // NEW: more filters
  const [from, setFrom] = useState<string>(""); // YYYY-MM-DD
  const [to, setTo] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>(""); // "", card, paypal, wire
  

  const statusForView = useMemo(() => (view === VIEW_PAYMENTS ? "succeeded,refunded" : ""), [view]);

  // badges
  const [countInvoices, setCountInvoices] = useState<number>(0);
  const [countPayments, setCountPayments] = useState<number>(0);

  // -------- toasts ----------
  type ToastMsg = { id: number; text: string; variant?: "success" | "danger" | "warning" | "info" };
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const pushToast = (text: string, variant: ToastMsg["variant"] = "info") =>
    setToasts((ts) => [...ts, { id: Date.now() + Math.random(), text, variant }]);
  const removeToast = (id: number) => setToasts((ts) => ts.filter((t) => t.id !== id));

  // -------- data load ----------
  const load = async () => {
    const baseParams: any = { page, q };
    const statuses: string[] = [];
    if (statusForView) statuses.push(statusForView);
    if (status) statuses.push(status);
    if (from) baseParams.from = from;
    if (to) baseParams.to = to;
    if (methodFilter) baseParams.method = methodFilter;
    const statusParam = statuses.filter(Boolean).join(",");
    const params = statusParam ? { ...baseParams, status: statusParam } : baseParams;

    const r = await api.get<ListResp>("admin/charges", { params });
    if (r.data?.ok) {
      setRows(r.data.data || []);
      setPages(r.data.pages || 1);
    }
  };
  const get = (obj: unknown, path: string[]): unknown => {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== "object" || cur === null || !(key in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
};

  // reflect in URL
  useEffect(() => {
    const qs = new URLSearchParams();
    if (view && view !== VIEW_INVOICES) qs.set("view", view);
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (methodFilter) qs.set("method", methodFilter);
    router.replace(`/admin/charges${qs.toString() ? `?${qs}` : ""}`, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, q, status, from, to, methodFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, status, from, to, methodFilter, statusForView]);

  // badges
  useEffect(() => {
    (async () => {
      const [allRes, payRes] = await Promise.all([
        api.get<ListResp>("admin/charges", { params: { page: 1, limit: 1 } }),
        api.get<ListResp>("admin/charges", { params: { page: 1, limit: 1, status: "succeeded,refunded" } }),
      ]);
      setCountInvoices(allRes.data?.total ?? 0);
      setCountPayments(payRes.data?.total ?? 0);
    })();
  }, []);

  const changeView = (v: string) => {
    setView(v);
    setStatus("");
    setPage(1);
  };

  // export now respects all filters
  const exportHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (statusForView) qs.set("status", statusForView);
    if (status) qs.set("status", [statusForView, status].filter(Boolean).join(","));
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (methodFilter) qs.set("method", methodFilter);
    return `/api/admin/charges/export${qs.toString() ? `?${qs}` : ""}`;
  }, [q, status, statusForView, from, to, methodFilter]);

  // -------- modal state ----------
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [desc, setDesc] = useState("Manual charge");
  const [methodType, setMethodType] = useState<"card" | "paypal" | "wire">("card");
  const [showAct, setShowAct] = useState(false);
const [actRows, setActRows] = useState<any[]>([]);
const [actFor, setActFor] = useState<string>("");
const [showRefund, setShowRefund] = useState(false);
const [refundInv, setRefundInv] = useState<string>("");
const [refundMaxMinor, setRefundMaxMinor] = useState<number>(0);
const [refundAmount, setRefundAmount] = useState<string>(""); // major units text
const [refundReason, setRefundReason] = useState<string>("Customer request");

async function openActivity(invoiceNo: string) {
  setShowAct(true);
  setActFor(invoiceNo);
  setActRows([]);
  try {
    const r = await api.get<{ ok: boolean; data: any[] }>(
      `admin/charges/activity/${encodeURIComponent(invoiceNo)}`
    );
    if (r.data?.ok) setActRows(r.data.data || []);
  } catch {
    // ignore
  }
}
function startRefund(row: ChargeRow) {
  if (!row.invoiceNo) return;
  setRefundInv(row.invoiceNo);
  // allow full amount by default
  const maxMinor = Number(row.amount || 0);
  setRefundMaxMinor(maxMinor);
  setRefundAmount((maxMinor / 100).toFixed(2));
  setRefundReason("Customer request");
  setShowRefund(true);
}

async function confirmRefund() {
  try {
    const amtMaj = Number(refundAmount);
    if (!Number.isFinite(amtMaj) || amtMaj <= 0) {
      pushToast("Enter a valid refund amount.", "warning");
      return;
    }
    await api.post(`admin/charges/refund/${encodeURIComponent(refundInv)}`, {
      amount: amtMaj,
      reason: refundReason || "admin",
    });
    setShowRefund(false);
    await load();
    pushToast(`Refund submitted for ${refundInv}`, "success");
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || "Refund failed";
    pushToast(msg, "danger");
  }
}


  // Saved card vs pay link
  const [collectMode, setCollectMode] = useState<"link" | "saved">("link");
  const [savedCardInfo, setSavedCardInfo] = useState<{ hasCard: boolean; brand?: string | null; last4?: string | null } | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setSavedCardInfo(null);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get<{ ok: boolean; hasCard: boolean; brand?: string; last4?: string }>(
          "admin/users/saved-card",
          { params: { email: userEmail } }
        );
        if (data?.ok) setSavedCardInfo(data as any);
      } catch {
        setSavedCardInfo(null);
      }
    })();
  }, [userEmail]);

  const createCharge = async () => {
    const amt = Number(amount);
    if (!userEmail || !amt || isNaN(amt)) {
      pushToast("Provide a valid user email and amount.", "warning");
      return;
    }
    setCreating(true);

    try {
      if (collectMode === "saved") {
        const r = await api.post<{ ok: boolean; data?: any; error?: string }>(
          "admin/charges/charge-saved-card",
          { userEmail, amount: amt, currency: "AED", description: desc }
        );
        setCreating(false);
        setShowNew(false);
        await load();

        if (r.data?.ok) {
          const d = r.data.data || {};
          if (d.status === "succeeded") {
            pushToast(`Charged successfully. Invoice ${d.invoiceNo} marked succeeded.`, "success");
          } else if (d.payUrl) {
            const open = confirm("Card requires authentication. Open pay link now?");
            if (open) window.open(d.payUrl, "_blank", "noopener,noreferrer");
          } else {
            pushToast("Charge created.", "success");
          }
        } else {
          pushToast(r.data?.error || "Failed to charge saved card", "danger");
        }
        return;
      }

      // pay link flow (pending)
      const { data } = await api.post<{ ok: boolean; invoiceNo: string }>("admin/charges/create", {
        userEmail, amount: amt, currency: "AED", description: desc, method: { type: methodType }, chargeNow: false,
      });
      setCreating(false);
      setShowNew(false);
      await load();
      if (data?.invoiceNo) {
        pushToast(`Invoice ${data.invoiceNo} created (pending). Use "Open Pay Link" in Actions.`, "success");
      }
    } catch (err: any) {
      setCreating(false);
      pushToast(err?.response?.data?.error || err?.message || "Failed to create charge", "danger");
    }
  };

  // -------- helpers (receipt / paylink) ----------
  const openPayLink = async (invoiceNo: string) => {
    try {
      const { data } = await api.get<{ ok: boolean; url?: string; error?: string }>(
        `admin/charges/paylink/${encodeURIComponent(invoiceNo)}`
      );
      if (data?.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        pushToast(data?.error || "No pay link available", "warning");
      }
   } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]); // handles Axios-style errors
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to open pay link";

  pushToast(msg, "danger");
}
  };

  const resendPayLink = async (invoiceNo: string) => {
    try {
      const { data } = await api.post<{ ok: boolean; error?: string }>(`admin/charges/paylink/${encodeURIComponent(invoiceNo)}`);
      if (data?.ok) pushToast(`Payment link sent to the customer for ${invoiceNo}.`, "success");
      else pushToast(data?.error || "Failed to send payment link", "danger");
    } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]); // handles Axios-style errors
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to send payment link" ;

  pushToast(msg, "danger");
} 
    
  };

  const openReceipt = async (invoiceNo: string) => {
    try {
      const { data } = await api.get<{ ok: boolean; url?: string; error?: string }>(
        `admin/charges/receipt/${encodeURIComponent(invoiceNo)}`
      );
      if (data?.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        pushToast(data?.error || "No receipt available", "warning");
      }
    } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]); // handles Axios-style errors
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to open receipt"

  pushToast(msg, "danger");
} 
     };

  return (
    <AdminLayout title="Charges / Invoices">
      {/* Toasts */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant} onClose={() => removeToast(t.id)} delay={4000} autohide>
            <Toast.Body className="text-white">{t.text}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>

      {/* Tabs + Actions */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <ButtonGroup>
          <ToggleButton
            id="tab-invoices"
            type="radio"
            variant={view === VIEW_INVOICES ? "primary" : "outline-primary"}
            checked={view === VIEW_INVOICES}
            value={VIEW_INVOICES}
            onChange={() => changeView(VIEW_INVOICES)}
          >
            Invoices <Badge bg="light" text="dark" className="ms-2">{countInvoices}</Badge>
          </ToggleButton>
          <ToggleButton
            id="tab-payments"
            type="radio"
            variant={view === VIEW_PAYMENTS ? "primary" : "outline-primary"}
            checked={view === VIEW_PAYMENTS}
            value={VIEW_PAYMENTS}
            onChange={() => changeView(VIEW_PAYMENTS)}
          >
            Payments <Badge bg="light" text="dark" className="ms-2">{countPayments}</Badge>
          </ToggleButton>
        </ButtonGroup>

        <div className="d-flex gap-2">
          <Button as="a" href={exportHref} target="_blank" rel="noreferrer" variant="outline-secondary">
            Export CSV
          </Button>
          <Button onClick={() => setShowNew(true)}>New Charge</Button>
        </div>
      </div>

      {/* Filters */}
      <Row className="align-items-end mb-3">
        <Col md={4}>
          <Form.Label>Search</Form.Label>
          <InputGroup>
            <Form.Control placeholder="Invoice # / Description / Email" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button onClick={() => setPage(1)}>Go</Button>
          </InputGroup>
        </Col>
        <Col md={2}>
          <Form.Label>Status</Form.Label>
          <Form.Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Form.Select>
          <div className="form-text">
            {view === VIEW_PAYMENTS ? "Payments show Succeeded & Refunded by default." : "Invoices show all statuses."}
          </div>
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
          <Form.Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">All</option>
            <option value="card">Card</option>
            <option value="paypal">PayPal</option>
            <option value="wire">Wire</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <Table hover responsive>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th style={{ width: 220 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const invId: string | undefined = r.invoiceNo ?? (r as any)?._id;

            return (
              <tr key={invId ?? String((r as any)?._id ?? Math.random())}>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                <td>{r.invoiceNo ?? (r as any)?._id ?? "—"}</td>
                <td>
                  <div>{r.userDoc?.name || "—"}</div>
                  <small className="text-muted">{r.userDoc?.email}</small>
                </td>
                <td>{fmt(r.amount, r.currency)}</td>
                <td>
                  {r.method?.type === "card" && <span>{r.method?.label || r.method?.brand} •••• {r.method?.last4}</span>}
                  {r.method?.type === "paypal" && <span>PayPal {r.method?.label || ""}</span>}
                  {r.method?.type === "wire" && <span>Wire {r.method?.label || ""}</span>}
                  {!r.method && "—"}
                </td>
                <td>
                  <Badge
                    bg={
                      r.status === "succeeded" ? "success" :
                      r.status === "pending" ? "warning" :
                      r.status === "failed" ? "danger" : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td>
                  <Dropdown>
                    <Dropdown.Toggle size="sm" variant="outline-secondary">Action</Dropdown.Toggle>
                    <Dropdown.Menu>
                      {invId ? (
                        <Dropdown.Item
                          as="a"
                          href={`/api/invoices/${encodeURIComponent(invId)}?format=html`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download PDF
                        </Dropdown.Item>
                      ) : (
                        <Dropdown.Item disabled>Download PDF</Dropdown.Item>
                      )}

                   <Dropdown.Item
                   onClick={() => r.invoiceNo ? openActivity(r.invoiceNo) : undefined}
                    disabled={!r.invoiceNo}
>
                    View Activity
                    </Dropdown.Item>


                      {/* pay link helpers */}
                      {r.status === "pending" && r.invoiceNo && (
                        <>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => openPayLink(r.invoiceNo!)}>Open Pay Link</Dropdown.Item>
                          <Dropdown.Item onClick={() => resendPayLink(r.invoiceNo!)}>Resend Pay Link (email)</Dropdown.Item>
                        </>
                      )}

                      {/* receipt link for paid/refunded */}
                      {(r.status === "succeeded" || r.status === "refunded") && r.invoiceNo && (
                        <>
                          <Dropdown.Divider />
                          <Dropdown.Item onClick={() => openReceipt(r.invoiceNo!)}>View Customer Receipt</Dropdown.Item>
                        </>
                      )}

                      <Dropdown.Divider />
                      <Dropdown.Header>Set status</Dropdown.Header>

                     {r.status === "succeeded" && r.invoiceNo && (
  <>
                    <Dropdown.Item onClick={() => startRefund(r)}>
                     Refund…
                   </Dropdown.Item>
  

                        </>
                      )}
                      {(r.status === "succeeded" || r.status === "refunded") && r.invoiceNo && (
  <>
    <Dropdown.Divider />
    <Dropdown.Item
      onClick={async () => {
        try {
          await api.post(`admin/charges/receipt/${encodeURIComponent(r.invoiceNo!)}`);
          pushToast(`Receipt sent for ${r.invoiceNo}`, "success");
       } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]); // handles Axios-style errors
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to send receipt" ;

  pushToast(msg, "danger");
 
        }
      }}
    >
      Resend Receipt (email)
    </Dropdown.Item>
    <Dropdown.Item onClick={() => openReceipt(r.invoiceNo!)}>Open Receipt</Dropdown.Item>
  </>
)}


                      <Dropdown.Item
                        onClick={() => api.patch(`admin/charges/${r.invoiceNo}`, { status: "succeeded", reason: "Admin update" }).then(() => { load(); })}
                      >
                        Mark Succeeded
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => api.patch(`admin/charges/${r.invoiceNo}`, { status: "failed", reason: "Admin update" }).then(() => { load(); })}
                      >
                        Mark Failed
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => api.patch(`admin/charges/${r.invoiceNo}`, { status: "refunded", reason: "Admin update" }).then(() => { load(); })}
                      >
                        Mark Refunded
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* Pager */}
      <div className="d-flex justify-content-center">
        <Pagination className="mb-0">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <Pagination.Item active>{page}</Pagination.Item>
          <Pagination.Next disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} />
        </Pagination>
      </div>

      {/* New Charge Modal */}
      <Modal show={showNew} onHide={() => !creating && setShowNew(false)} centered>
        <Modal.Header closeButton><Modal.Title>New Charge</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>User email</Form.Label>
              <Form.Control placeholder="user@example.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount (AED)</Form.Label>
              <InputGroup>
                <InputGroup.Text>AED</InputGroup.Text>
                <Form.Control type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Form.Group>

            {/* Collect mode */}
            <Form.Group className="mb-3">
              <Form.Label>Collect via</Form.Label>
              <div className="d-flex gap-3">
                <Form.Check type="radio" id="collect-link" label="Pay link (customer pays)" checked={collectMode === "link"} onChange={() => setCollectMode("link")} />
                <Form.Check type="radio" id="collect-saved" label="Charge saved card now" checked={collectMode === "saved"} onChange={() => setCollectMode("saved")} disabled={!savedCardInfo?.hasCard} />
              </div>
              {collectMode === "saved" && !savedCardInfo?.hasCard && (
                <div className="form-text text-danger">No saved card found for this user. Ask them to pay once via Checkout to save a card.</div>
              )}
              {savedCardInfo?.hasCard && <div className="form-text">Using saved card {savedCardInfo.brand?.toUpperCase()} ••••{savedCardInfo.last4}</div>}
            </Form.Group>

            <Form.Group>
              <Form.Label>Method</Form.Label>
              <Form.Select value={methodType} onChange={(e) => setMethodType(e.target.value as any)}>
                <option value="card">Card</option>
                <option value="paypal">PayPal</option>
                <option value="wire">Wire</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={creating} onClick={() => setShowNew(false)}>Cancel</Button>
          <Button disabled={creating} onClick={createCharge}>{creating ? <Spinner size="sm" /> : "Create"}</Button>
        </Modal.Footer>
      </Modal>

      {/* Refund Modal */}
<Modal show={showRefund} onHide={() => setShowRefund(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Refund {refundInv}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      <div className="mb-2 text-muted">
        Max refundable: {(refundMaxMinor / 100).toFixed(2)}
      </div>
      <Form.Group className="mb-3">
        <Form.Label>Amount</Form.Label>
        <InputGroup>
          <InputGroup.Text>AED</InputGroup.Text>
          <Form.Control
            type="number"
            min={0}
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
        </InputGroup>
      </Form.Group>
      <Form.Group>
        <Form.Label>Reason</Form.Label>
        <Form.Control
          placeholder="Reason shown in activity log"
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
        />
      </Form.Group>
    </Form>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowRefund(false)}>Cancel</Button>
    <Button variant="danger" onClick={confirmRefund}>Refund</Button>
  </Modal.Footer>
</Modal>

      <Modal show={showAct} onHide={() => setShowAct(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Activity — {actFor}</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {!actRows.length && <div className="text-muted">No activity yet.</div>}
    <div className="d-flex flex-column gap-2">
      {actRows.map((a, i) => (
        <div key={i} className="border rounded p-2">
          <div>
            <strong>{a.action}</strong>{" "}
            <small className="text-muted">
              {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
            </small>
          </div>
          {a.details && (
            <pre className="mb-0 mt-1" style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(a.details, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  </Modal.Body>
</Modal>

    </AdminLayout>
  );
}
