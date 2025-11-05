import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Table, Button, Spinner, Alert, Modal, Form, Row, Col } from "react-bootstrap";

export default function Promotions() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ title: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPromos();
  }, []);

  function fetchPromos() {
    setLoading(true);
    fetch("/api/admin/marketing/promotions")
      .then(res => res.json())
      .then(setPromos)
      .catch(() => setError("Failed to load promotions"))
      .finally(() => setLoading(false));
  }

  function openAdd() {
    setEditing(null);
    setForm({ title: "", endDate: "" });
    setShowModal(true);
  }

  function openEdit(promo: any) {
    setEditing(promo);
    setForm({ title: promo.title, endDate: promo.endDate?.slice(0, 10) || "" });
    setShowModal(true);
  }

  async function handleSave(e: any) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.title || !form.endDate) {
      setError("Title and end date are required.");
      setSaving(false);
      return;
    }

    const method = editing ? "PATCH" : "POST";
    const url = editing
      ? `/api/admin/marketing/promotions/${editing._id}`
      : "/api/admin/marketing/promotions";
    const body = editing
      ? JSON.stringify({ title: form.title, endDate: form.endDate, status: editing.status })
      : JSON.stringify({ title: form.title, endDate: form.endDate });

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      setError("Failed to save promotion.");
      setSaving(false);
      return;
    }
    setShowModal(false);
    fetchPromos();
    setSaving(false);
  }

  const filtered = promos.filter(promo =>
    promo.title.toLowerCase().includes(search.toLowerCase()) ||
    (promo.status || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h2 className="fw-bold mb-4">Promotions</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            placeholder="Search by title or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Col>
        <Col xs="auto">
          <Button onClick={openAdd}>Add Promotion</Button>
        </Col>
      </Row>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted">No promotions found.</td>
              </tr>
            )}
            {filtered.map((promo) => (
              <tr key={promo._id}>
                <td>{promo.title}</td>
                <td>{promo.status}</td>
                <td>{new Date(promo.endDate).toLocaleDateString()}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => openEdit(promo)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    disabled={promo.status !== "Active"}
                    onClick={async () => {
                      await fetch(`/api/admin/marketing/promotions/${promo._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "Expired" }),
                      });
                      fetchPromos();
                    }}
                  >
                    End Now
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add/Edit Promotion Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? "Edit Promotion" : "Add Promotion"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                autoFocus
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Promotion"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
