import { useEffect, useState } from "react";
import { Card, Button, Table, Row, Col, Modal, Form, Spinner, Alert, InputGroup } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

type Invoice = {
  _id: string;
  user: { _id: string; name: string; email: string };
  number: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  total: number;
  status: "Paid" | "Unpaid";
  dueDate?: string;
  notes?: string;
  createdAt: string;
};

type User = { _id: string; name: string; email: string };

const statusColor = (status: string) => status === "Paid" ? "#16a34a" : "#eab308";

function InvoiceFormModal({ show, onHide, onSaved, invoice, users }: any) {
  const [form, setForm] = useState<any>(invoice || {
    user: "",
    number: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    status: "Unpaid",
    dueDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Update items total
  useEffect(() => {
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) => ({
        ...item,
        total: (item.quantity || 1) * (item.unitPrice || 0)
      }))
    }));
  }, [form.items]);

  const handleChange = (field: string, value: any) => setForm({ ...form, [field]: value });

  const handleItemChange = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx][field] = value;
    setForm({ ...form, items });
  };

  const handleAddItem = () =>
    setForm({ ...form, items: [...form.items, { description: "", quantity: 1, unitPrice: 0, total: 0 }] });

  const handleRemoveItem = (idx: number) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const url = invoice?._id ? `/api/admin/invoices/${invoice._id}` : `/api/admin/invoices`;
    const method = invoice?._id ? "PATCH" : "POST";
    try {
      const total = form.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, total }),
      });
      if (!res.ok) throw new Error();
      onSaved();
      onHide();
      toast.success(`Invoice ${invoice?._id ? "updated" : "created"}!`);
    } catch {
      toast.error("Error saving invoice!");
    }
    setSaving(false);
  };

  useEffect(() => {
    if (show) setForm(invoice || {
      user: "",
      number: "",
      items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
      status: "Unpaid",
      dueDate: "",
      notes: "",
    });
  }, [show, invoice]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{invoice ? "Edit Invoice" : "Add Invoice"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Invoice Number</Form.Label>
                <Form.Control
                  value={form.number}
                  onChange={e => handleChange("number", e.target.value)}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>User</Form.Label>
                <Form.Select
                  value={form.user}
                  onChange={e => handleChange("user", e.target.value)}
                  required
                >
                  <option value="">Select User</option>
                  {users.map((u: User) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={e => handleChange("status", e.target.value)}
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Due Date</Form.Label>
                <Form.Control
                  type="date"
                  value={form.dueDate ? form.dueDate?.substring(0, 10) : ""}
                  onChange={e => handleChange("dueDate", e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-2">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              value={form.notes || ""}
              onChange={e => handleChange("notes", e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Invoice Items</Form.Label>
            {form.items.map((item: any, idx: number) => (
              <Row key={idx} className="align-items-end mb-2">
                <Col md={4}>
                  <Form.Control
                    placeholder="Description"
                    value={item.description}
                    onChange={e => handleItemChange(idx, "description", e.target.value)}
                    required
                  />
                </Col>
                <Col md={2}>
                  <Form.Control
                    placeholder="Qty"
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => handleItemChange(idx, "quantity", Number(e.target.value))}
                    required
                  />
                </Col>
                <Col md={3}>
                  <InputGroup>
                    <InputGroup.Text>AED</InputGroup.Text>
                    <Form.Control
                      placeholder="Unit Price"
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={e => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                      required
                    />
                  </InputGroup>
                </Col>
                <Col md={2}>
                  <Form.Control
                    value={item.total}
                    disabled
                    readOnly
                  />
                </Col>
                <Col md={1}>
                  <Button variant="danger" onClick={() => handleRemoveItem(idx)} size="sm" disabled={form.items.length === 1}>×</Button>
                </Col>
              </Row>
            ))}
            <Button variant="outline-success" onClick={handleAddItem} size="sm" className="mt-1">
              + Add Item
            </Button>
          </Form.Group>
          <div className="text-end fw-bold mt-3">
            Total: {form.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)} AED
          </div>
          <div className="mt-3 d-flex justify-content-end">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Spinner size="sm" /> : (invoice ? "Update Invoice" : "Create Invoice")}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Paid" | "Unpaid">("All");

  // Load invoices & users
  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/invoices").then(r => r.json()),
      fetch("/api/admin/users").then(r => r.json())
    ]).then(([inv, us]) => {
      setInvoices(inv);
      setUsers(us);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
      fetchAll();
      toast.success("Invoice deleted!");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // Mark as Paid/Unpaid
  const handleToggleStatus = async (invoice: Invoice) => {
    try {
      await fetch(`/api/admin/invoices/${invoice._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: invoice.status === "Paid" ? "Unpaid" : "Paid" }),
      });
      fetchAll();
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // Filtered list
  const filtered = invoices.filter(inv =>
    (filter === "All" || inv.status === filter) &&
    (search === "" ||
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.user?.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container py-4">
      <ToastContainer position="top-center" />
      <Row className="mb-3 align-items-end">
        <Col md={6}>
          <h2 className="fw-bold mb-0">Invoices</h2>
        </Col>
        <Col md={6} className="text-end">
          <Button variant="success" onClick={() => { setEditInvoice(null); setShowModal(true); }}>
            + Add Invoice
          </Button>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col md={4}>
          <Form.Select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </Form.Select>
        </Col>
        <Col md={8}>
          <Form.Control
            placeholder="Search by invoice number, user, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Col>
      </Row>
      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : filtered.length === 0 ? (
            <Alert variant="info" className="text-center">No invoices found.</Alert>
          ) : (
            <Table hover responsive size="sm">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>User</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv._id}>
                    <td>{inv.number}</td>
                    <td>
                      {inv.user?.name} <span className="text-secondary" style={{ fontSize: 13 }}>({inv.user?.email})</span>
                    </td>
                    <td>
                      <strong>{inv.total} AED</strong>
                    </td>
                    <td>
                      <span style={{
                        background: statusColor(inv.status),
                        color: "#fff",
                        padding: "4px 10px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        minWidth: 64,
                        display: "inline-block",
                        textAlign: "center"
                      }}>{inv.status}</span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="ms-2"
                        onClick={() => handleToggleStatus(inv)}
                      >
                        {inv.status === "Paid" ? "Mark Unpaid" : "Mark Paid"}
                      </Button>
                    </td>
                    <td>{inv.dueDate ? inv.dueDate.substring(0, 10) : "--"}</td>
                    <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        variant="info"
                        size="sm"
                        className="me-1"
                        onClick={() => { setEditInvoice(inv); setShowModal(true); }}
                      >Edit</Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(inv._id)}
                      >Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      {/* Modal */}
      {showModal &&
        <InvoiceFormModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSaved={fetchAll}
          invoice={editInvoice}
          users={users}
        />}
    </div>
  );
}
