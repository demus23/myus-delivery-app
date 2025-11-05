import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Table, Spinner, Form, Button, Modal, Alert } from "react-bootstrap";

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ userEmail: "", amount: "", method: "Card", status: "Pending", ref: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/payments")
      .then(res => res.json())
      .then(data => { setPayments(data); setLoading(false); });
  }, []);

  function handleAdd() {
    fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, amount: Number(addForm.amount) }),
    })
      .then(res => res.json())
      .then(data => {
        setPayments([data, ...payments]);
        setMsg("Payment added!");
        setShowAdd(false);
        setAddForm({ userEmail: "", amount: "", method: "Card", status: "Pending", ref: "" });
        setTimeout(() => setMsg(null), 1200);
      });
  }
  

  return (
    <AdminLayout>
      <h1 style={{ fontWeight: 700, marginBottom: 20 }}>Payments</h1>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="mb-3 d-flex gap-2">
        <Button variant="success" onClick={() => setShowAdd(true)}>Add Manual Payment</Button>
        {/* Could add export/download here */}
      </div>
      <Table hover responsive className="shadow-sm bg-white rounded">
        <thead>
          <tr>
            <th>User Email</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Ref</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}><Spinner animation="border" /></td></tr>
          ) : payments.length === 0 ? (
            <tr><td colSpan={6}>No payments found.</td></tr>
          ) : payments.map(p => (
            <tr key={p._id}>
              <td>{p.userEmail}</td>
              <td>{p.amount} AED</td>
              <td>{p.method}</td>
              <td>
                {p.status === "Completed" ? <span style={{ color: "#16a34a", fontWeight: 700 }}>Completed</span>
                  : p.status === "Pending" ? <span style={{ color: "#eab308", fontWeight: 700 }}>Pending</span>
                  : <span style={{ color: "#dc2626", fontWeight: 700 }}>{p.status}</span>}
              </td>
              <td>{p.ref || "--"}</td>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Add Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Manual Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>User Email</Form.Label>
              <Form.Control type="email" value={addForm.userEmail}
                onChange={e => setAddForm(f => ({ ...f, userEmail: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Amount (AED)</Form.Label>
              <Form.Control type="number" value={addForm.amount}
                onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Method</Form.Label>
              <Form.Select value={addForm.method}
                onChange={e => setAddForm(f => ({ ...f, method: e.target.value }))}>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="Online">Online</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Status</Form.Label>
              <Form.Select value={addForm.status}
                onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Reference</Form.Label>
              <Form.Control value={addForm.ref}
                onChange={e => setAddForm(f => ({ ...f, ref: e.target.value }))} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="success" onClick={handleAdd}>Add</Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
