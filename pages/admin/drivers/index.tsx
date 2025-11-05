import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, Table, Button, Spinner, Modal, Form, Alert } from "react-bootstrap";

// ----- Add Driver Modal -----
function AddDriverModal({ show, onHide, onDriverAdded }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not add driver");
      }
      setName("");
      setEmail("");
      setPhone("");
      onDriverAdded();
      onHide();
    } catch (err: any) {
      setError(err.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!show) {
      setName("");
      setEmail("");
      setPhone("");
      setError("");
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Driver</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleAdd}>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={e => setName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={phone} onChange={e => setPhone(e.target.value)} required />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" variant="success" className="w-100" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Add Driver"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// ----- Edit Driver Modal -----
function EditDriverModal({ show, onHide, driver, onDriverUpdated }: any) {
  const [name, setName] = useState(driver?.name || "");
  const [email, setEmail] = useState(driver?.email || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (driver) {
      setName(driver.name || "");
      setEmail(driver.email || "");
      setPhone(driver.phone || "");
      setError("");
    }
  }, [driver, show]);

  const handleEdit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/drivers/${driver._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not update driver");
      }
      onDriverUpdated();
      onHide();
    } catch (err: any) {
      setError(err.message || "Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Driver</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleEdit}>
          <Form.Group className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={e => setName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={phone} onChange={e => setPhone(e.target.value)} required />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" variant="primary" className="w-100" disabled={loading}>
            {loading ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// ----- Main Drivers Admin Page -----
export default function DriversAdminPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  // Fetch drivers
  const fetchDrivers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/drivers");
    const data = await res.json();
    setDrivers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Delete driver
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
    fetchDrivers();
  };

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Drivers</h3>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add Driver
        </Button>
      </div>
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <Table hover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center">No drivers found.</td>
                  </tr>
                )}
                {drivers.map((d) => (
                  <tr key={d._id}>
                    <td>{d.name}</td>
                    <td>{d.email}</td>
                    <td>{d.phone}</td>
                    <td>{d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => { setSelectedDriver(d); setShowEditModal(true); }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(d._id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      {/* Add Modal */}
      <AddDriverModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onDriverAdded={fetchDrivers}
      />
      {/* Edit Modal */}
      <EditDriverModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        driver={selectedDriver}
        onDriverUpdated={fetchDrivers}
      />
    </AdminLayout>
  );
}
