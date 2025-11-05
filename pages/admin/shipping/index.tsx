import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, Table, Button, Spinner, Modal, Form, Row, Col, InputGroup } from "react-bootstrap";

export default function AdminShipping() {
  const [shipping, setShipping] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Fetch shipping, users, packages, drivers
  useEffect(() => {
    fetch("/api/admin/shipping").then(res => res.json()).then(setShipping).finally(() => setLoading(false));
    fetch("/api/admin/users").then(res => res.json()).then(setUsers);
    fetch("/api/admin/packages").then(res => res.json()).then(setPackages);
    fetch("/api/admin/drivers").then(res => res.json()).then(setDrivers);
  }, []);

  const handleSave = async (e: any) => {
    e.preventDefault();
    const data = {
      package: e.target.package.value,
      user: e.target.user.value,
      driver: e.target.driver.value || undefined,
      status: e.target.status.value,
      shippedAt: e.target.shippedAt.value || undefined,
      deliveredAt: e.target.deliveredAt.value || undefined,
      notes: e.target.notes.value
    };
    setLoading(true);
    if (editItem?._id) {
      await fetch(`/api/admin/shipping/${editItem._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } else {
      await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    }
    setShowModal(false);
    setEditItem(null);
    fetch("/api/admin/shipping").then(res => res.json()).then(setShipping).finally(() => setLoading(false));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shipping record?")) return;
    setLoading(true);
    await fetch(`/api/admin/shipping/${id}`, { method: "DELETE" });
    fetch("/api/admin/shipping").then(res => res.json()).then(setShipping).finally(() => setLoading(false));
  };

  // Filtered data
  const filtered = shipping.filter(
    s =>
      (search === "" ||
        (s.package?.tracking || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.status || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <Row className="align-items-center mb-4">
        <Col>
          <h3 className="fw-bold">Shipping Records</h3>
        </Col>
        <Col xs="auto">
          <InputGroup>
            <Form.Control
              placeholder="Search by user, package, status"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Button variant="success" onClick={() => { setEditItem(null); setShowModal(true); }}>
              <i className="bi bi-plus-circle me-1"></i> New Shipping
            </Button>
          </InputGroup>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : (
            <Table hover size="sm" responsive>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>User</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Shipped</th>
                  <th>Delivered</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>{s.package?.tracking}</td>
                    <td>{s.user?.name}</td>
                    <td>{s.driver?.name}</td>
                    <td>{s.status}</td>
                    <td>{s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : ""}</td>
                    <td>{s.deliveredAt ? new Date(s.deliveredAt).toLocaleDateString() : ""}</td>
                    <td>{s.notes}</td>
                    <td>
                      <Button size="sm" variant="info" onClick={() => { setEditItem(s); setShowModal(true); }}>
                        <i className="bi bi-pencil-square"></i>
                      </Button>{" "}
                      <Button size="sm" variant="danger" onClick={() => handleDelete(s._id)}>
                        <i className="bi bi-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setEditItem(null); }}>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? "Edit Shipping" : "New Shipping"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSave}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Package</Form.Label>
              <Form.Select name="package" defaultValue={editItem?.package?._id || ""} required>
                <option value="">-- Select --</option>
                {packages.map((p: any) => (
                  <option key={p._id} value={p._id}>{p.tracking}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>User</Form.Label>
              <Form.Select name="user" defaultValue={editItem?.user?._id || ""} required>
                <option value="">-- Select --</option>
                {users.map((u: any) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Driver</Form.Label>
              <Form.Select name="driver" defaultValue={editItem?.driver?._id || ""}>
                <option value="">-- Select --</option>
                {drivers.map((d: any) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Status</Form.Label>
              <Form.Select name="status" defaultValue={editItem?.status || "Pending"}>
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Problem">Problem</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Shipped At</Form.Label>
              <Form.Control name="shippedAt" type="date"
                defaultValue={editItem?.shippedAt ? new Date(editItem.shippedAt).toISOString().split("T")[0] : ""} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Delivered At</Form.Label>
              <Form.Control name="deliveredAt" type="date"
                defaultValue={editItem?.deliveredAt ? new Date(editItem.deliveredAt).toISOString().split("T")[0] : ""} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Notes</Form.Label>
              <Form.Control name="notes" as="textarea" rows={2} defaultValue={editItem?.notes || ""} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" variant="success">
              {editItem ? "Update" : "Add"}
            </Button>
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditItem(null); }}>
              Cancel
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
