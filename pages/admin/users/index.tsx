// pages/admin/users/index.tsx
import AdminLayout from "@/components/AdminLayout";
import {
  Table,
  Button,
  Badge,
  Form,
  Modal,
  Spinner,
  Pagination,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";

/* ---------- Types ---------- */

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "superadmin" | string;
  phone?: string;
  membership?: string;
  subscribed?: boolean;
  suiteId?: string | null;
  emailVerified?: boolean;
  createdAt?: string | number;
  updatedAt?: string | number;
};

type ListResp = {
  data: User[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  sort: Record<string, 1 | -1>;
};

const emptyForm = {
  name: "",
  email: "",
  role: "user",
  banned: false,
};

/* ---------- Component ---------- */

export default function AdminUsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSuper = session?.user?.role === "superadmin";
  const router = useRouter();

  // Table data
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Query state (server-driven)
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sort, setSort] = useState("createdAt:desc"); // "field:asc,other:desc"
  const [roleFilter, setRoleFilter] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"" | "true" | "false">("");

  // Meta
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Modals / forms
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editUserId, setEditUserId] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  /* ---------- Access control ---------- */

  if (
    sessionStatus !== "loading" &&
    (sessionStatus === "unauthenticated" ||
      (session?.user?.role !== "admin" && session?.user?.role !== "superadmin"))
  ) {
    if (typeof window !== "undefined") router.push("/login");
  }

  /* ---------- Helpers ---------- */

  const normalizeUser = (u: any): User => ({
    id: String(u._id ?? u.id ?? ""),
    name: u.name ?? "",
    email: u.email ?? "",
    role: (u.role ?? "user") as any,
    phone: u.phone ?? "",
    membership: u.membership ?? "Free",
    subscribed: !!u.subscribed,
    suiteId: u.suiteId == null ? "" : String(u.suiteId),
    emailVerified: !!u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });

  function parseSortChain(s: string): Array<{ key: string; dir: 1 | -1 }> {
    return s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [k, d] = p.split(":");
        return { key: k, dir: (d?.toLowerCase() === "desc" ? -1 : 1) as 1 | -1 };
      });
  }

  function val(v: any) {
    if (v == null) return "";
    return typeof v === "string" ? v.toLowerCase() : v;
  }

  const formatDate = (d?: string | number) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return "—";
    }
  };

  function toggleSort(col: string) {
    const parts = sort
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const [first, ...rest] = parts;
    const [fCol, fDir = "asc"] = (first || "").split(":");

    if (fCol === col) {
      const nextDir = fDir.toLowerCase() === "asc" ? "desc" : "asc";
      setSort(`${col}:${nextDir}${rest.length ? "," + rest.join(",") : ""}`);
    } else {
      const defaultDir = col.toLowerCase().includes("created") ? "desc" : "asc";
      setSort(`${col}:${defaultDir}`);
    }
    setPage(1);
  }

  function sortIcon(col: string) {
    const [fCol, fDir] = (sort.split(",")[0] || "").split(":");
    if (fCol !== col) return "";
    return fDir?.toLowerCase() === "desc" ? "▼" : "▲";
  }

  function safe(v: any) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  /* ---------- Loader (tolerant to API shape) ---------- */

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const params = new URLSearchParams({
        search: q,
        page: String(page),
        limit: String(limit),
        sort,
      });
      if (roleFilter) params.append("role", roleFilter);
      if (membershipFilter) params.append("membership", membershipFilter);
      if (verifiedFilter) params.append("verified", verifiedFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();

      // Case A: API returns paginated object: { data, total, pages, ... }
      if (Array.isArray(payload?.data)) {
        const list: User[] = payload.data.map(normalizeUser);
        setRows(list);
        setTotal(Number(payload.total ?? list.length));
        setPages(Number(payload.pages ?? 1));
        return;
      }

      // Case B: API returns { users: [...] } or just an array
      const raw = Array.isArray(payload?.users)
        ? payload.users
        : Array.isArray(payload)
        ? payload
        : [];

      let list: User[] = raw.map(normalizeUser);

      // Local filter
      const qlc = q.trim().toLowerCase();
      if (qlc) {
        list = list.filter((u) =>
          [
            u.name,
            u.email,
            u.phone,
            u.suiteId ?? "",
            u.membership ?? "",
            u.role ?? "",
          ]
            .map((x) => String(x ?? "").toLowerCase())
            .join(" ")
            .includes(qlc)
        );
      }
      if (roleFilter) list = list.filter((u) => u.role === roleFilter);
      if (membershipFilter) list = list.filter((u) => u.membership === membershipFilter);
      if (verifiedFilter)
        list = list.filter(
          (u) => (u.emailVerified ? "true" : "false") === verifiedFilter
        );

      // Local sorting (supports multi-column sort chain)
      const chain = parseSortChain(sort);
      if (chain.length) {
        list = [...list].sort((a: any, b: any) => {
          for (const { key, dir } of chain) {
            const av = val(a[key]);
            const bv = val(b[key]);
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
          }
          return 0;
        });
      }

      // Local paging
      const totalCount = list.length;
      const pagesLocal = Math.max(1, Math.ceil(totalCount / limit));
      const start = (page - 1) * limit;
      const slice = list.slice(start, start + limit);

      setRows(slice);
      setTotal(totalCount);
      setPages(pagesLocal);
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load users";
  setErr(msg);   
    } finally {
      setLoading(false);
    }
  }

  // Debounced load on filter/sort/paging changes
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, limit, sort, roleFilter, membershipFilter, verifiedFilter]);

  /* ---------- CRUD ---------- */

  async function addUser() {
    if (!addForm.name || !addForm.email) {
      toast.error("Please fill required fields");
      return;
    }
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addForm.name,
        email: addForm.email,
        role: addForm.role,
        banned: !!addForm.banned,
      }),
    });
    if (res.ok) {
      toast.success("User added");
      setShowAdd(false);
      setAddForm({ ...emptyForm });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error || "Failed to add user");
    }
  }

  function openEdit(u: User) {
    setEditForm({
      name: u.name,
      email: u.email,
      role: (u.role as any) || "user",
      banned: false,
    });
    setEditUserId(u.id);
    setShowEdit(true);
  }

  async function updateUser() {
    if (!editUserId) return;
    const res = await fetch(`/api/admin/users/${editUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        banned: !!editForm.banned,
      }),
    });
    if (res.ok) {
      toast.success("User updated");
      setShowEdit(false);
      setEditUserId(null);
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error || "Failed to update user");
    }
  }

  async function deleteUser() {
    if (!deleteUserId) return;
    const res = await fetch(`/api/admin/users/${deleteUserId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("User deleted");
      setShowDelete(false);
      setDeleteUserId(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast.error(j?.error || "Failed to delete user");
    }
  }

  /* ---------- Export CSV (works with either API shape) ---------- */

  async function exportCSV() {
    try {
      const header = [
        "Name",
        "Email",
        "Role",
        "Phone",
        "Membership",
        "Subscribed",
        "Suite",
        "Email Verified",
        "Created",
      ];
      const rowsAll: string[][] = [];

      // If the API supports paging server-side, fetch in pages.
      // If not, we’ll fetch once and do it locally from payload.users.

      const pageSize = 100;
      const base = new URLSearchParams({
        search: q,
        limit: String(pageSize),
        sort,
      });
      if (roleFilter) base.append("role", roleFilter);
      if (membershipFilter) base.append("membership", membershipFilter);
      if (verifiedFilter) base.append("verified", verifiedFilter);

      const first = await fetch(
        `/api/admin/users?${new URLSearchParams({
          ...Object.fromEntries(base),
          page: "1",
        }).toString()}`
      );
      if (!first.ok) throw new Error(`HTTP ${first.status}`);
      const firstPayload = await first.json();

      const push = (arr: any[]) => {
        arr.map(normalizeUser).forEach((u) => {
          rowsAll.push([
            safe(u.name),
            safe(u.email),
            safe(u.role),
            safe(u.phone),
            safe(u.membership || "Free"),
            u.subscribed ? "Yes" : "No",
            safe(u.suiteId || ""),
            u.emailVerified ? "Yes" : "No",
            safe(formatDate(u.createdAt)),
          ]);
        });
      };

      if (Array.isArray(firstPayload?.data)) {
        // server-paginated
        push(firstPayload.data);
        const totalPages = Number(firstPayload.pages ?? 1);
        for (let p = 2; p <= totalPages; p++) {
          const res = await fetch(
            `/api/admin/users?${new URLSearchParams({
              ...Object.fromEntries(base),
              page: String(p),
            }).toString()}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const payload = await res.json();
          push(payload.data || []);
        }
      } else {
        // non-paginated; payload.users or array
        const raw = Array.isArray(firstPayload?.users)
          ? firstPayload.users
          : Array.isArray(firstPayload)
          ? firstPayload
          : [];
        push(raw);
      }

      const csv = [header, ...rowsAll]
        .map((cols) =>
          cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
} catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to export CSV";
  toast.error(msg);   
      
    }
  }

  /* ---------- Sidebar links ---------- */

  const sidebarLinks = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Users", href: "/admin/users" },
      { label: "Packages", href: "/admin/packages" },
    ],
    []
  );

  /* ---------- Render ---------- */

  if (sessionStatus === "loading") {
    return (
      <AdminLayout sidebarLinks={sidebarLinks}>
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout sidebarLinks={sidebarLinks}>
      <div style={{ maxWidth: 1250, margin: "0 auto", padding: 32 }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Admin Users
          </h1>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={exportCSV}>
              Export CSV
            </Button>
            <Button variant="success" onClick={() => setShowAdd(true)}>
              + Add New User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Row className="g-2 align-items-end mb-3">
          <Col md="4">
            <Form.Label>Search</Form.Label>
            <Form.Control
              placeholder="name, email, phone, suite…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </Col>
          <Col md="2">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </Form.Select>
          </Col>
          <Col md="2">
            <Form.Label>Membership</Form.Label>
            <Form.Select
              value={membershipFilter}
              onChange={(e) => {
                setMembershipFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="Free">Free</option>
              <option value="Premium">Premium</option>
              <option value="Pro">Pro</option>
            </Form.Select>
          </Col>
          <Col md="2">
            <Form.Label>Verified</Form.Label>
            <Form.Select
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </Form.Select>
          </Col>
          <Col md="2">
            <Form.Label>Per Page</Form.Label>
            <Form.Select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Form.Select>
          </Col>
        </Row>

        {err && <Alert variant="danger">{err}</Alert>}

        <Table hover responsive className="bg-white shadow-sm rounded">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>
                Name {sortIcon("name")}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("email")}>
                Email {sortIcon("email")}
              </th>
              <th>Role</th>
              <th>Phone</th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("membership")}
              >
                Membership {sortIcon("membership")}
              </th>
              <th>Subscribed</th>
              <th>Suite</th>
              <th>Verified</th>
              <th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("createdAt")}
              >
                Joined {sortIcon("createdAt")}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>
                  <div className="d-flex justify-content-center py-4">
                    <Spinner animation="border" />
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-decoration-none fw-semibold"
                    >
                      {u.name}
                    </Link>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === "admin" || u.role === "superadmin" ? (
                      <Badge bg={u.role === "superadmin" ? "dark" : "info"}>
                        {u.role === "superadmin" ? "Super Admin" : "Admin"}
                      </Badge>
                    ) : (
                      <Badge bg="secondary">User</Badge>
                    )}
                  </td>
                  <td>{u.phone || "—"}</td>
                  <td>{u.membership || "Free"}</td>
                  <td>
                    {u.subscribed ? (
                      <Badge bg="success">Yes</Badge>
                    ) : (
                      <Badge bg="secondary">No</Badge>
                    )}
                  </td>
                  <td>{u.suiteId || "—"}</td>
                  <td>
                    {u.emailVerified ? (
                      <Badge bg="success">Yes</Badge>
                    ) : (
                      <Badge bg="secondary">No</Badge>
                    )}
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-warning"
                      className="me-1"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => {
                        setShowDelete(true);
                        setDeleteUserId(u.id);
                      }}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        {/* Pagination */}
        <div className="d-flex justify-content-end align-items-center">
          <Pagination>
            <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
            <Pagination.Prev
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            />
            {Array.from({ length: pages }).map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === page}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            />
            <Pagination.Last onClick={() => setPage(pages)} disabled={page === pages} />
          </Pagination>
        </div>
      </div>

      {/* Add Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name*</Form.Label>
              <Form.Control
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email*</Form.Label>
              <Form.Control
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
  <Form.Label>Role</Form.Label>
  <Form.Select
    value={addForm.role}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
      setAddForm((f) => ({ ...f, role: e.target.value as any }))
    }   // <-- close the onChange prop here
    disabled={!isSuper}
  >
    <option value="user">User</option>
    <option value="admin">Admin</option>
    {isSuper && <option value="superadmin">Super Admin</option>}
  </Form.Select>
  {!isSuper && (
    <div className="form-text">Only superadmins can assign elevated roles.</div>
  )}
</Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                label="Banned"
                checked={(addForm as any).banned}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, banned: e.target.checked }))
                }
              />
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

      {/* Edit Modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Name*</Form.Label>
              <Form.Control
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email*</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value as any }))
                }
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                label="Banned"
                checked={(editForm as any).banned}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, banned: e.target.checked }))
                }
              />
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
          <Modal.Title>Delete User</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this user?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deleteUser}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </AdminLayout>
  );
}
