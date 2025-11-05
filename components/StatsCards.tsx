// components/StatsCards.tsx
import { Card, Row, Col, Spinner } from "react-bootstrap";
// The file exists but the exported hook is `useDashboardData` (not useDashboardStats)
import { useDashboardData } from "../hooks/useDashboardStats";

export default function StatsCards() {
  // Safe defaults so UI renders even while loading
  const {
    users = 0,
    packages = 0,
    revenue = 0,
    urgentIssues = 0,
    loading = false,
  } = (typeof useDashboardData === "function" ? useDashboardData() : {}) as {
    users?: number;
    packages?: number;
    revenue?: number;
    urgentIssues?: number;
    loading?: boolean;
  };

  const currency = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(revenue);

  const stats = [
    { label: "Total Users",   value: users,        icon: "bi-people",            color: "#0d6efd" },
    { label: "Packages",      value: packages,     icon: "bi-boxes",             color: "#34c759" },
    { label: "Revenue",       value: currency,     icon: "bi-currency-dollar",   color: "#fd7e14" },
    { label: "Urgent Issues", value: urgentIssues, icon: "bi-exclamation-circle",color: "#ff3b30" },
  ] as const;

  return (
    <Row className="mb-4">
      {stats.map((s, i) => (
        <Col key={i} md={3} className="mb-3">
          <Card className="shadow-sm border-0" style={{ minHeight: 110 }}>
            <Card.Body className="d-flex align-items-center">
              <div
                className="me-3 d-flex justify-content-center align-items-center rounded-circle"
                style={{
                  width: 48,
                  height: 48,
                  background: `${s.color}22`,
                  color: s.color,
                  fontSize: 26,
                }}
              >
                <i className={`bi ${s.icon}`} />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: 15 }}>{s.label}</div>
                <div className="fw-bold" style={{ fontSize: 20 }}>
                  {loading ? <Spinner size="sm" animation="border" /> : s.value}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
