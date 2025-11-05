import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Table, Button, Spinner, Alert, Modal, Form, Row, Col } from "react-bootstrap";

export default function Subscribers() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchSubs();
  }, []);

  function fetchSubs() {
    setLoading(true);
    fetch("/api/admin/marketing/subscribers")
      .then(res => res.json())
      .then(setSubs)
      .catch(() => setError("Failed to load subscribers"))
      .finally(() => setLoading(false));
  }

  const unsubscribe = async (id: string) => {
    await fetch(`/api/admin/marketing/subscribers/${id}`, { method: "PATCH" });
    setSubs(subs => subs.map(sub => sub._id === id ? { ...sub, status: "Unsubscribed" } : sub));
  };

  const handleAdd = async (e: any) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setError("Enter a valid email address.");
      setAdding(false);
      return;
    }
    const res = await fetch("/api/admin/marketing/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      setError("Failed to add subscriber (maybe already exists?)");
      setAdding(false);
      return;
    }
    setEmail("");
    setShowModal(false);
    fetchSubs();
    setAdding(false);
  };

  // Search/filter
  const filtered = subs.filter(sub =>
    sub.email.toLowerCase().includes(search.toLowerCase()) ||
    (sub.status || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <h2 className="fw-bold mb-4">Marketing Subscribers</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Control
            placeholder="Search by email or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Col>
        <Col xs="auto">
          <Button onClick={() => setShowModal(true)}>Add Subscriber</Button>
        </Col>
      </Row>

      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted">No subscribers found.</td>
              </tr>
            )}
            {filtered.map((sub) => (
              <tr key={sub._id}>
                <td>{sub.email}</td>
                <td>{sub.status}</td>
                <td>{new Date(sub.joined).toLocaleDateString()}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={sub.status === "Unsubscribed"}
                    onClick={() => unsubscribe(sub._id)}
                  >
                    Unsubscribe
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Subscriber Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleAdd}>
          <Modal.Header closeButton>
            <Modal.Title>Add Subscriber</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                required
                autoFocus
                onChange={e => setEmail(e.target.value)}
                placeholder="subscriber@email.com"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={adding}>{adding ? "Adding..." : "Add Subscriber"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
