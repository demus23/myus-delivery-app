// pages/admin/dashboard.tsx
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Card,
  Spinner,
  Table,
  Row,
  Col,
  Button,
  Image,
  Alert,
  Modal,
  Form,
  InputGroup,
} from "react-bootstrap";
import Link from "next/link";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import RecentPaymentActivityCard from "@/components/RecentPaymentActivityCard";
import FinanceSnapshot from "@/components/admin/FinanceSnapshot";
import TransactionHistoryCard from "@/components/admin/TransactionHistoryCard";
import ShippingCalcWidget from "@/components/ShippingCalcWidget";
import AdminShippingSettingsTable from "@/components/AdminShippingSettingsTable";
//import ShippingQuoteModal from "@/components/ShippingQuoteModal";
import ShippingQuoteSimple from "@/components/ShippingQuoteSimple";
import TrackingSearchCard from "@/components/tracking/TrackingSearchCard";
import dynamic from "next/dynamic";
const ShipmentsWidget = dynamic(() => import("@/components/admin/ShipmentsWidget"), { ssr: false });



Chart.register(ArcElement, Tooltip, Legend);

// ---------- helpers ----------
function prettyStatus(s?: string) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmt(dt?: string | number) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

// --- AI Modal (kept, tidy) ---
function AIToolsModal({ show, onHide }: { show: boolean; onHide: () => void }) {
  const [tab, setTab] = useState<
    "chat" | "shipping" | "consolidation" | "product" | "translation"
  >("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult("");
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, input }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: data.result || "No result." },
      ]);
      setResult(data.result || "");
    } catch {
      setResult("AI error. Try again.");
    }
    setInput("");
    setLoading(false);
  };

  useEffect(() => {
    setInput("");
    setMessages([]);
    setResult("");
  }, [show, tab]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-robot me-2" />
          AI Tools
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ minHeight: 370 }}>
        <div className="d-flex gap-2 mb-3 flex-wrap">
          {[
            ["chat", "primary", "Chat"],
            ["shipping", "success", "Shipping Cost"],
            ["consolidation", "warning", "Consolidate Packages"],
            ["product", "info", "Product Search"],
            ["translation", "secondary", "Translation"],
          ].map(([k, v, label]) => (
            <Button
              key={k}
              variant={tab === k ? (v as any) : (`outline-${v}` as any)}
              size="sm"
              onClick={() => setTab(k as any)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div
          style={{
            maxHeight: 220,
            overflowY: "auto",
            marginBottom: 12,
            background: "#f7fafc",
            borderRadius: 8,
            padding: 8,
          }}
        >
          {messages.length === 0 && (
            <div className="text-muted text-center py-5">
              Ask anything related to {tab}…
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className="mb-2"
              style={{ textAlign: msg.role === "user" ? "right" : "left" }}
            >
              <span
                className={`px-3 py-2 rounded-3 d-inline-block ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-light border"
                }`}
              >
                {msg.content}
              </span>
            </div>
          ))}
        </div>
        <InputGroup>
          <Form.Control
            placeholder={
              tab === "chat"
                ? "Ask a general question…"
                : tab === "shipping"
                ? "Describe your shipment (origin, dest, weight)…"
                : tab === "consolidation"
                ? "List packages to consolidate…"
                : tab === "product"
                ? "Describe the product to search…"
                : "Enter text for translation…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            variant="primary"
          >
            {loading ? <Spinner size="sm" /> : <i className="bi bi-send" />}
          </Button>
        </InputGroup>
        {result && (
          <Alert variant="info" className="mt-3">
            <strong>AI:</strong> {result}
          </Alert>
        )}
      </Modal.Body>
    </Modal>
  );
}

type AdminDoc = {
  userId: string;
  userEmail: string;
  suiteId?: string | null;
  docId: string;
  label: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);

  // Quick tracking
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState<
    | {
        status?: string;
        location?: string;
        createdAt?: string;
        lastUpdate?: string;
      }
    | string
    | null
  >(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [openQuote, setOpenQuote] = useState(false);
  const [showAdminQuote, setShowAdminQuote] = useState(false);



  // Latest documents
  const [latestDocs, setLatestDocs] = useState<AdminDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState<boolean>(true);

  // load stats
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/dashboard-stats");
        const data = await res.json();
        if (!canceled) {
          setStats(data || {});
        }
      } catch {
        if (!canceled) setStats({});
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  const loadDocs = async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/admin/documents?limit=20");
      const data = await res.json();
      setLatestDocs(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      setLatestDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };
  useEffect(() => {
    loadDocs();
  }, []);

  const handleDeleteDoc = async (docId: string) => {
    const ok = window.confirm("Delete this document?");
    if (!ok) return;
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLatestDocs((d) => d.filter((x) => x.docId !== docId));
    } else {
      alert("Failed to delete document.");
    }
  };

  // unified tracking
  const handleTrackingSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = trackingNumber.trim();
    if (!t) return;
    setTrackingLoading(true);
    setTrackingResult(null);
    try {
      const res = await fetch(
        `/api/tracking/events?trackingNo=${encodeURIComponent(t)}&limit=1`
      );
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const ev = data?.events?.[0];
      if (!ev) {
        setTrackingResult("Not found");
      } else {
        setTrackingResult({
          status: ev.status,
          location: ev.location,
          createdAt: ev.createdAt,
          lastUpdate: ev.createdAt,
        });
      }
    } catch {
      setTrackingResult("Not found");
    } finally {
      setTrackingLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: 300 }}
        >
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  const packageChart = {
    labels: ["Delivered", "Pending", "In Transit", "Problem"],
    datasets: [
      {
        data: [
          stats?.deliveredCount || 0,
          stats?.pendingCount || 0,
          stats?.inTransitCount || 0,
          stats?.problemCount || 0,
        ],
        backgroundColor: ["#16a34a", "#eab308", "#0ea5e9", "#dc2626"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <AdminLayout>
      {showAnnouncement && (
        <Alert
          variant="info"
          dismissible
          onClose={() => setShowAnnouncement(false)}
          className="mb-3"
        >
          <strong>🚀 System Update:</strong> New AI-powered tools & analytics
          are available!
        </Alert>
      )}

      {/* Row 1: Quick Track + Quick Shipping Calc */}
      <Row className="mb-4 g-3">
        <Col md={8}>
          <Card className="shadow h-100">
            <Card.Body>
              <h5 className="fw-semibold mb-3">Quick Track</h5>
              <Form
                onSubmit={handleTrackingSearch}
                className="d-flex align-items-center gap-2 flex-wrap"
              >
                <Form.Label className="mb-0 fw-bold" style={{ minWidth: 110 }}>
                  Tracking #:
                </Form.Label>
                <Form.Control
                  placeholder="Enter Tracking #"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  style={{ maxWidth: 220 }}
                  required
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={trackingLoading}
                >
                  {trackingLoading ? <Spinner size="sm" /> : "Track"}
                </Button>

                {trackingResult && (
                  <span className="ms-3" style={{ fontSize: 15 }}>
                    {typeof trackingResult === "string" ? (
                      trackingResult
                    ) : (
                      <>
                        <strong>Status:</strong>{" "}
                        {prettyStatus(trackingResult.status)}{" "}
                        {trackingResult.location && (
                          <>
                            &nbsp;• <strong>Location:</strong>{" "}
                            {trackingResult.location}
                          </>
                        )}
                        {trackingResult.lastUpdate && (
                          <>
                            &nbsp;• <strong>Updated:</strong>{" "}
                            {fmt(trackingResult.lastUpdate)}
                          </>
                        )}
                      </>
                    )}
                  </span>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
         <Card className="shadow h-100">
  <Card.Body>
    <h5 className="fw-semibold mb-3">Shipping Calculator</h5>

    {/* Quick preview (defaults) */}
    <ShippingCalcWidget />

    {/* Button to open the full form */}
    <div className="mt-3">
      <Button variant="outline-primary" size="sm" onClick={() => setShowAdminQuote(true)}>
        Open full form
      </Button>
    </div>

    {/* Full form modal */}
    <ShippingQuoteSimple show={showAdminQuote} onHide={() => setShowAdminQuote(false)} />

  </Card.Body>
</Card>

        </Col>
      </Row>

      {/* Row 2: Address + Stores */}
      <Row className="mb-4 g-3">
        <Col md={6}>
          <Card className="shadow">
            <Card.Body>
              <h6 className="fw-bold mb-2">Main UAE Delivery Address</h6>
              <address className="mb-2">
                <strong>Warehouse</strong>
                <br />
                Suite 305, Business Bay, Dubai, UAE
                <br />
                +971-50-123-4567
              </address>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(
                    "Suite 305, Business Bay, Dubai, UAE"
                  )
                }
                aria-label="Copy address to clipboard"
              >
                Copy Address
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow">
            <Card.Body>
              <h6 className="fw-bold mb-2">Shop From Top Online Stores</h6>
              <div className="d-flex gap-3 align-items-center">
                <a
                  href="https://amazon.ae"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src="/amazon.svg" alt="Amazon" height={34} />
                </a>
                <a
                  href="https://ebay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src="/ebay.svg" alt="eBay" height={32} />
                </a>
                <a
                  href="https://noon.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src="/noon.svg" alt="Noon" height={32} />
                </a>
                <Link
                  href="/stores"
                  style={{
                    color: "#6c757d",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  and more…
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Summary tiles */}
      <Row className="mb-4 g-3">
        <Col sm={6} md={3}>
          <Card className="shadow text-center">
            <Card.Body>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0ea5e9" }}>
                {stats?.userCount ?? 0}
              </div>
              <div className="text-muted">Total Users</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} md={3}>
          <Card className="shadow text-center">
            <Card.Body>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#6366f1" }}>
                {stats?.packageCount ?? 0}
              </div>
              <div className="text-muted">Total Packages</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} md={2}>
          <Card className="shadow text-center">
            <Card.Body>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>
                {stats?.deliveredCount ?? 0}
              </div>
              <div className="text-muted">Delivered</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} md={2}>
          <Card className="shadow text-center">
            <Card.Body>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#eab308" }}>
                {stats?.pendingCount ?? 0}
              </div>
              <div className="text-muted">Pending</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} md={2}>
          <Card className="shadow text-center">
            <Card.Body>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0ea5e9" }}>
                {stats?.driverCount ?? 0}
              </div>
              <div className="text-muted">Drivers</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      

      {/* Row 4: Chart + Transaction + Activity */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="shadow">
            <Card.Body>
              <h6 className="fw-bold mb-3">Packages by Status</h6>
              <Pie data={packageChart} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow">
            <Card.Body>
              <h6 className="fw-bold mb-3">Transaction History</h6>
              <Table size="sm" hover>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.transactions || []).map((tx: any) => (
                    <tr key={tx.id}>
                      <td>{tx.id}</td>
                      <td>{tx.amount} AED</td>
                      <td>{tx.method}</td>
                      <td>
                        <span
                          style={{
                            color:
                              tx.status === "Completed"
                                ? "#16a34a"
                                : tx.status === "Pending"
                                ? "#eab308"
                                : "#dc2626",
                            fontWeight: 700,
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td>{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow">
            <Card.Body>
              <h6 className="fw-bold mb-3">Latest Activity</h6>
              <Table
                hover
                size="sm"
                className="bg-white rounded"
                style={{ fontSize: 14 }}
              >
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.activity && stats.activity.length > 0 ? (
                    stats.activity.map((log: any) => (
                      <tr key={log._id}>
                        <td>{fmt(log.createdAt)}</td>
                        <td>{log.action}</td>
                        <td>{log.entity}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>No activity found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 5: Recent Payments */}
      <Row className="g-3 mb-4">
        <Col md={6} lg={4}>
          <RecentPaymentActivityCard />
        </Col>
      </Row>
          
      <div>
        <TrackingSearchCard initialTrackingNo="AB23456" compact enablePolling pollMs={20000} />
      </div>

<div className="space-y-6">
      <ShipmentsWidget />
    </div>
  

      {/* Row 6: Latest User Documents */}
      <Row className="mb-4 g-3">
        <Col md={12}>
          <Card className="shadow">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0">Latest User Documents</h6>
                <div className="d-flex gap-2">
                  <Button size="sm" variant="outline-secondary" onClick={loadDocs}>
                    Refresh
                  </Button>
                </div>
              </div>
              <Table hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Uploaded</th>
                    <th>Label</th>
                    <th>User Email</th>
                    <th>Suite</th>
                    <th>File</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docsLoading ? (
                    <tr>
                      <td colSpan={6}>
                        <Spinner size="sm" /> Loading…
                      </td>
                    </tr>
                  ) : latestDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No documents found.</td>
                    </tr>
                  ) : (
                    latestDocs.map((d) => (
                      <tr key={d.docId}>
                        <td>{fmt(d.uploadedAt)}</td>
                        <td>{d.label || d.filename}</td>
                        <td>{d.userEmail}</td>
                        <td>{d.suiteId || "—"}</td>
                        <td>
                          {d.url ? (
                            <a href={d.url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDeleteDoc(d.docId)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 7: Shipping Settings (embedded) */}
      <Row className="mb-4 g-3">
        <Col md={12}>
          <Card className="shadow">
            <Card.Body>
              <h5 className="fw-semibold mb-3">Shipping Settings</h5>
              <AdminShippingSettingsTable embedded />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 8: Finance & Transactions */}
      <h2 className="mb-3">Finance</h2>
      <FinanceSnapshot />
      <div className="container-fluid">
        <div className="row g-3">
          <div className="col-12">
            <TransactionHistoryCard />
          </div>
        </div>
      </div>

      {/* Floating AI Tools Button */}
      <div
        style={{ position: "fixed", bottom: 32, right: 32, zIndex: 9999 }}
        aria-live="polite"
      >
        <Button
          style={{
            borderRadius: "50%",
            width: 60,
            height: 60,
            background: "#08b1ee",
            fontSize: 27,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Open AI Tools"
          aria-label="Open AI Tools"
          onClick={() => setShowChatbot(true)}
        >
          <i className="bi bi-robot"></i>
        </Button>
        <AIToolsModal show={showChatbot} onHide={() => setShowChatbot(false)} />
      </div>
    </AdminLayout>
  );
}
