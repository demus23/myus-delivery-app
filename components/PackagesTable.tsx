import { Table, Button, Badge, Form, Pagination, Modal, Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Papa from "papaparse";

// --- Package Type (match your backend) ---
type Package = {
  _id?: string | number;
  id?: string | number;
  trackingNumber: string;
  user?: { name?: string; email: string };
  courier?: string;
  value?: number;
  status: "pending" | "in_transit" | "delivered" | "problem";
  createdAt?: string;
  updatedAt?: string;
};

const emptyForm = {
  trackingNumber: "",
  userEmail: "",
  courier: "",
  value: "",
  status: "pending",
};

export default function PackagesTable({ refreshFlag }: { refreshFlag?: number }) {
  // Data state
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Table/filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof Package>("trackingNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<Package | null>(null);

  // Fetch packages
  function refresh() {
    setLoading(true);
    fetch("/api/admin/packages")
      .then(res => res.json())
      .then(data => {
        setPackages(Array.isArray(data) ? data : []);
        setLoading(false);
        setSelectedIds([]);
      })
      .catch(() => setLoading(false));
  }
  useEffect(refresh, [refreshFlag]);

  // Filtering/search
  let filtered = packages.filter((p: Package) =>
    (p.trackingNumber || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.user?.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.status || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.courier || "").toLowerCase().includes(search.toLowerCase())
  );

  // Sorting
  filtered = filtered.sort((a, b) => {
    const valA = (a[sortBy] || "").toString().toLowerCase();
    const valB = (b[sortBy] || "").toString().toLowerCase();
    if (sortDir === "asc") return valA > valB ? 1 : valA < valB ? -1 : 0;
    return valA < valB ? 1 : valA > valB ? -1 : 0;
  });

  // Pagination
  const perPage = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Export
  function handleExportCSV() {
    const csv = Papa.unparse(filtered.map(p => ({
      Tracking: p.trackingNumber,
      Courier: p.courier || "",
      Value: p.value || "",
      User: p.user?.email || "",
      Status: p.status,
      Created: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
      Updated: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ""
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "packages.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Bulk select logic
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? paged.map(p => p._id || p.id || "") : []);
  }
  function toggleSelect(id: string | number, checked: boolean) {
    setSelectedIds(ids => checked ? [...ids, id] : ids.filter(i => i !== id));
  }
  function handleBulkDelete() {
    setShowDelete(true);
    setToDelete(null);
  }

  // CRUD Actions
  async function addPackage() {
    const payload = {
      tracking: addForm.trackingNumber,
      courier: addForm.courier,
      value: Number(addForm.value),
      userEmail: addForm.userEmail,
      status: addForm.status
    };
    const res = await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Package added!");
      setShowAdd(false);
      setAddForm({ ...emptyForm });
      refresh();
    } else {
      toast.error("Failed to add package.");
    }
  }
  async function updatePackage() {
    if (!editPkg?._id && !editPkg?.id) return;
    const payload = {
      tracking: editForm.trackingNumber,
      courier: editForm.courier,
      value: Number(editForm.value),
      userEmail: editForm.userEmail,
      status: editForm.status
    };
    const res = await fetch(`/api/admin/packages/${editPkg._id || editPkg.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Package updated!");
      setShowEdit(false);
      setEditPkg(null);
      refresh();
    } else {
      toast.error("Failed to update package.");
    }
  }
  async function deletePackage(id: string | number) {
    const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Package deleted!");
      setShowDelete(false);
      setToDelete(null);
      refresh();
    } else {
      toast.error("Failed to delete package.");
    }
  }
  async function bulkDelete() {
    for (const id of selectedIds) {
      await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    }
    toast.success("Packages deleted!");
    setShowDelete(false);
    setToDelete(null);
    refresh();
  }

  // UI Helpers
  function handleEditClick(pkg: Package) {
    setEditPkg(pkg);
    setEditForm({
      trackingNumber: pkg.trackingNumber,
      courier: pkg.courier || "",
      value: pkg.value ? String(pkg.value) : "",
      status: pkg.status,
      userEmail: pkg.user?.email || ""
    });
    setShowEdit(true);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <Form.Control
          placeholder="Search by tracking, user, courier, or status"
          className="me-2"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 260 }}
        />
        <Button variant="success" onClick={() => setShowAdd(true)}>
          + Add New Package
        </Button>
        <Button variant="primary" onClick={handleExportCSV}>
          Export CSV
        </Button>
        {selectedIds.length > 0 && (
          <Button variant="danger" onClick={handleBulkDelete}>
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>
      <Table hover responsive className="bg-white shadow-sm rounded">
        <thead>
          <tr>
            <th>
              <Form.Check
                checked={paged.every(p => selectedIds.includes(p._id || p.id || ""))}
                onChange={e => toggleSelectAll(e.target.checked)}
              />
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("trackingNumber"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
              Tracking # {sortBy === "trackingNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Courier</th>
            <th>Value</th>
            <th>User</th>
            <th>Status</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9}><Spinner animation="border" /></td></tr>
          ) : paged.length === 0 ? (
            <tr><td colSpan={9}>No packages found.</td></tr>
          ) : paged.map(pkg => {
            const id = pkg._id || pkg.id || "";
            return (
              <tr key={id}>
                <td>
                  <Form.Check
                    checked={selectedIds.includes(id)}
                    onChange={e => toggleSelect(id, e.target.checked)}
                  />
                </td>
                <td>{pkg.trackingNumber}</td>
                <td>{pkg.courier || "--"}</td>
                <td>{pkg.value !== undefined ? pkg.value : "--"}</td>
                <td>{pkg.user?.name || pkg.user?.email || "--"}</td>
                <td>
                  {pkg.status === "delivered" && <Badge bg="success">Delivered</Badge>}
                  {pkg.status === "pending" && <Badge bg="warning">Pending</Badge>}
                  {pkg.status === "problem" && <Badge bg="danger">Problem</Badge>}
                  {pkg.status === "in_transit" && <Badge bg="info">In Transit</Badge>}
                </td>
                <td>{pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : "--"}</td>
                <td>{pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : "--"}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-warning"
                    className="me-1"
                    onClick={() => handleEditClick(pkg)}
                  >Edit</Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => { setShowDelete(true); setToDelete(pkg); }}
                  >Delete</Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </Table>

      {/* Pagination */}
      <div className="d-flex justify-content-end align-items-center">
        <Pagination>
          <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
          <Pagination.Prev onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
          {Array.from({ length: pageCount }).map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={i + 1 === page}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} />
          <Pagination.Last onClick={() => setPage(pageCount)} disabled={page === pageCount} />
        </Pagination>
      </div>

      {/* Add Package Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Package</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tracking Number</Form.Label>
              <Form.Control
                type="text"
                value={addForm.trackingNumber}
                onChange={e => setAddForm(f => ({ ...f, trackingNumber: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Courier</Form.Label>
              <Form.Control
                type="text"
                value={addForm.courier}
                onChange={e => setAddForm(f => ({ ...f, courier: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value (USD)</Form.Label>
              <Form.Control
                type="number"
                value={addForm.value}
                onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Email</Form.Label>
              <Form.Control
                type="email"
                value={addForm.userEmail}
                onChange={e => setAddForm(f => ({ ...f, userEmail: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={addForm.status}
                onChange={e => setAddForm(f => ({ ...f, status: e.target.value as any }))}
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="problem">Problem</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={addPackage}>
            Add Package
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Package Modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Package</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tracking Number</Form.Label>
              <Form.Control
                type="text"
                value={editForm.trackingNumber}
                onChange={e => setEditForm(f => ({ ...f, trackingNumber: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Courier</Form.Label>
              <Form.Control
                type="text"
                value={editForm.courier}
                onChange={e => setEditForm(f => ({ ...f, courier: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value (USD)</Form.Label>
              <Form.Control
                type="number"
                value={editForm.value}
                onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.userEmail}
                onChange={e => setEditForm(f => ({ ...f, userEmail: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editForm.status}
                onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
              >
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="problem">Problem</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={updatePackage}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Package(s)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete
            ? <>Are you sure you want to delete <b>{toDelete.trackingNumber}</b>?</>
            : <>Are you sure you want to delete <b>{selectedIds.length}</b> packages?</>
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (toDelete) deletePackage(toDelete._id || toDelete.id || "");
              else bulkDelete();
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
