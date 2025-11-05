import { useState, useEffect } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Table, Button, Modal, Form, Spinner, InputGroup } from "react-bootstrap";
import Papa from "papaparse";

type Inventory = {
  _id?: string;
  itemName: string;
  sku: string;
  quantity: number;
  location?: string;
  updatedAt?: string;
};

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Inventory | null>(null);
  const [form, setForm] = useState({ itemName: "", sku: "", quantity: 0, location: "" });
  const [search, setSearch] = useState("");

  // Load inventory
  const refresh = () => {
    setLoading(true);
    fetch("/api/admin/inventory")
      .then(res => res.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };
  useEffect(refresh, []);

  // Modal handlers
  function openAdd() {
    setEditItem(null);
    setForm({ itemName: "", sku: "", quantity: 0, location: "" });
    setShowModal(true);
  }
  function openEdit(item: Inventory) {
    setEditItem(item);
    setForm({ 
      itemName: item.itemName, 
      sku: item.sku, 
      quantity: item.quantity, 
      location: item.location || "" 
    });
    setShowModal(true);
  }
  async function save() {
    const payload = { ...form, quantity: Number(form.quantity) };
    const method = editItem ? "PUT" : "POST";
    const body = editItem ? { ...payload, _id: editItem._id } : payload;
    const res = await fetch("/api/admin/inventory", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      setShowModal(false);
      refresh();
    }
  }
  async function remove(id: string | undefined) {
    if (!id) return;
    await fetch("/api/admin/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id })
    });
    refresh();
  }

  // Export as CSV
  function exportCSV() {
    const csv = Papa.unparse(items.map(({ itemName, sku, quantity, location, updatedAt }) => ({
      Item: itemName, SKU: sku, Quantity: quantity, Location: location || "", "Last Updated": updatedAt
        ? new Date(updatedAt).toLocaleString() : ""
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inventory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Search logic
  const filtered = items.filter(
    item =>
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 style={{ fontWeight: 700 }}>Inventory</h1>
        <div className="d-flex gap-2">
          <InputGroup>
            <Form.Control
              placeholder="Search item or SKU"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 210 }}
            />
          </InputGroup>
          <Button variant="success" onClick={openAdd}>+ Add Item</Button>
          <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>
      <Table hover className="bg-white shadow-sm rounded">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Location</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6}><Spinner animation="border" /></td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={6}>No items found.</td></tr>
          ) : filtered.map(item => (
            <tr key={item._id}>
              <td>{item.itemName}</td>
              <td>{item.sku}</td>
              <td>{item.quantity}</td>
              <td>{item.location || "--"}</td>
              <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "--"}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-2" onClick={() => openEdit(item)}>Edit</Button>
                <Button size="sm" variant="outline-danger" onClick={() => remove(item._id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? "Edit Item" : "Add New Item"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Item Name</Form.Label>
              <Form.Control value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>SKU</Form.Label>
              <Form.Control value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Quantity</Form.Label>
              <Form.Control type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Location</Form.Label>
              <Form.Control value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="success" onClick={save}>{editItem ? "Save" : "Add"}</Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
