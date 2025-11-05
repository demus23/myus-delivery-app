import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Table, Button, Modal, Form, Row, Col, Spinner, Alert } from "react-bootstrap";

type Store = {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
};

export default function StoresAdmin() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch stores
  useEffect(() => {
    fetchStores();
  }, []);

  function fetchStores() {
    setLoading(true);
    fetch("/api/admin/stores")
      .then(res => res.json())
      .then(setStores)
      .catch(() => setError("Failed to load stores."))
      .finally(() => setLoading(false));
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", address: "", phone: "", email: "" });
    setShowModal(true);
  }
  function openEdit(store: Store) {
    setEditing(store);
    setForm({
  name: store.name,
  address: store.address,
  phone: store.phone || "",
  email: store.email || ""
});
    setShowModal(true);
  }
  function handleDelete(id: string) {
    if (!window.confirm("Delete this store?")) return;
    fetch(`/api/admin/stores/${id}`, { method: "DELETE" })
      .then(() => fetchStores());
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/admin/stores/${editing._id}` : `/api/admin/stores`;
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(res => {
        if (!res.ok) throw new Error("Error saving store");
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        fetchStores();
      })
      .catch(() => setError("Failed to save store."))
      .finally(() => setSaving(false));
  }

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(search.toLowerCase()) ||
    (store.address || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h2 className="fw-bold mb-4">Stores Management</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            placeholder="Search by name or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Col>
        <Col xs="auto">
          <Button onClick={openAdd}>Add Store</Button>
        </Col>
      </Row>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStores.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">
                  No stores found.
                </td>
              </tr>
            )}
            {filteredStores.map(store => (
              <tr key={store._id}>
                <td>{store.name}</td>
                <td>{store.address}</td>
                <td>{store.phone}</td>
                <td>{store.email}</td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openEdit(store)}
                    className="me-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(store._id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? "Edit Store" : "Add Store"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                required
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={form.phone || ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={form.email || ""}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
