import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Table, Spinner, Alert, Form, Row, Col, Button, Pagination } from "react-bootstrap";

const PAGE_SIZE = 15;

function downloadCSV(logs: any[]) {
  const headers = ["Time", "User", "Action", "Entity", "Details"];
  const rows = logs.map(log => [
    `"${new Date(log.createdAt).toLocaleString()}"`,
    `"${log.user || ""}"`,
    `"${log.action || ""}"`,
    `"${log.entity || ""}"`,
    `"${log.detail || ""}"`,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = `system-logs-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch logs from API (server-side filtering is available)
  useEffect(() => {
    setLoading(true);
    const url = search
      ? `/api/admin/logs?search=${encodeURIComponent(search)}`
      : `/api/admin/logs`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        setLogs(data);
        setError(null);
        setCurrentPage(1);
      })
      .catch(() => setError("Failed to load logs."))
      .finally(() => setLoading(false));
  }, [search]);

  // Pagination logic
  const pageCount = Math.ceil(logs.length / PAGE_SIZE);
  const pageLogs = logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AdminLayout>
      <h2 className="fw-bold mb-4">System Logs</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3 align-items-center">
        <Col xs={12} md={6} className="mb-2 mb-md-0">
          <Form.Control
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Col>
        <Col xs="auto">
          <Button
            variant="outline-success"
            disabled={logs.length === 0}
            onClick={() => downloadCSV(logs)}
          >
            Export CSV
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="my-4 text-center"><Spinner animation="border" /></div>
      ) : pageLogs.length === 0 ? (
        <Alert variant="info">No logs found.</Alert>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {pageLogs.map(log => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user}</td>
                    <td>{log.action}</td>
                    <td>{log.entity}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {pageCount > 1 && (
            <Pagination className="justify-content-center">
              <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
              <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} />
              {Array.from({ length: pageCount }, (_, i) => (
                <Pagination.Item
                  key={i + 1}
                  active={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, pageCount))} disabled={currentPage === pageCount} />
              <Pagination.Last onClick={() => setCurrentPage(pageCount)} disabled={currentPage === pageCount} />
            </Pagination>
          )}
        </>
      )}
    </AdminLayout>
  );
}
