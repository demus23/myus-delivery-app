import { Table, Button, Badge, Form, Pagination, Modal, Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Papa from "papaparse";

// --- User Type ---
type User = {
  _id?: string | number;
  id?: string | number;
  name?: string;
  email: string;
  role?: string;
  banned?: boolean;
  createdAt?: string;
  lastLogin?: string;
};

const emptyForm = { name: "", email: "", role: "user" };

export default function UsersTable() {
  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Table/filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof User>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [showDelete, setShowDelete] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);

  // Fetch users
  function refresh() {
    setLoading(true);
    fetch("/api/admin/users")
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
        setSelectedIds([]);
      })
      .catch(() => setLoading(false));
  }
  useEffect(refresh, []);

  // Filtering/search
  let filtered = users.filter((u: User) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
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
    const csv = Papa.unparse(filtered.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.banned ? "Banned" : "Active",
      Joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
      LastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : ""
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Bulk select logic
  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? paged.map(u => u._id || u.id || "") : []);
  }
  function toggleSelect(id: string | number, checked: boolean) {
    setSelectedIds(ids => checked ? [...ids, id] : ids.filter(i => i !== id));
  }
  function handleBulkDelete() {
    setShowDelete(true);
    setToDelete(null);
  }

  // CRUD Actions
  async function addUser() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      toast.success("User added!");
      setShowAdd(false);
      setAddForm({ ...emptyForm });
      refresh();
    } else {
      toast.error("Failed to add user.");
    }
  }
  async function updateUser() {
    if (!editUser?._id && !editUser?.id) return;
    const res = await fetch(`/api/admin/users/${editUser._id || editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      toast.success("User updated!");
      setShowEdit(false);
      setEditUser(null);
      refresh();
    } else {
      toast.error("Failed to update user.");
    }
  }
  async function deleteUser(id: string | number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted!");
      setShowDelete(false);
      setToDelete(null);
      refresh();
    } else {
      toast.error("Failed to delete user.");
    }
  }
  async function bulkDelete() {
    // You can POST to a bulk delete endpoint or loop (simple example)
    for (const id of selectedIds) {
      await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    }
    toast.success("Users deleted!");
    setShowDelete(false);
    setToDelete(null);
    refresh();
  }

  // UI Helpers
  function handleEditClick(user: User) {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: user.role || "user"
    });
    setShowEdit(true);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <Form.Control
          placeholder="Search users by name or email"
          className="me-2"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: 260 }}
        />
        <Button variant="success" onClick={() => setShowAdd(true)}>
          + Add New User
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
                checked={paged.every(u => selectedIds.includes(u._id || u.id || ""))}
                onChange={e => toggleSelectAll(e.target.checked)}
              />
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("name"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
              Name {sortBy === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th style={{ cursor: "pointer" }} onClick={() => { setSortBy("email"); setSortDir(sortDir === "asc" ? "desc" : "asc"); }}>
              Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
            </th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Last Login</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8}><Spinner animation="border" /></td></tr>
          ) : paged.length === 0 ? (
            <tr><td colSpan={8}>No users found.</td></tr>
          ) : paged.map(u => {
            const id = u._id || u.id || "";
            return (
              <tr key={id}>
                <td>
                  <Form.Check
                    checked={selectedIds.includes(id)}
                    onChange={e => toggleSelect(id, e.target.checked)}
                  />
                </td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <Badge bg={u.role === "Admin" || u.role === "admin" ? "primary" : "secondary"}>
                    {u.role}
                  </Badge>
                </td>
                <td>
                  <Badge bg={u.banned ? "danger" : "success"}>
                    {u.banned ? "Banned" : "Active"}
                  </Badge>
                </td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "--"}</td>
                <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "--"}</td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-warning"
                    className="me-1"
                    onClick={() => handleEditClick(u)}
                  >Edit</Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => { setShowDelete(true); setToDelete(u); }}
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

      {/* Add User Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={addForm.role}
                onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={addUser}>
            Add User
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={editForm.role}
                onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={updateUser}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete User(s)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {toDelete
            ? <>Are you sure you want to delete <b>{toDelete.name || toDelete.email}</b>?</>
            : <>Are you sure you want to delete <b>{selectedIds.length}</b> users?</>
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (toDelete) deleteUser(toDelete._id || toDelete.id || "");
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
