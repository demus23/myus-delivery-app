// pages/admin/packages/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Table,
  Button,
  Badge,
  Form,
  Modal,
  Spinner,
  Pagination,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";

// -------------------- Types --------------------
type CanonicalStatus =
  | "Pending"
  | "Received"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Forwarded"
  | "In Transit"
  | "Problem"; // local-only fallback

type Package = {
  _id?: string;
  tracking: string;
  courier: string;
  value: number;
  status: string;
  userEmail?: string;
  suiteId?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TrackingEvent = {
  _id: string;
  packageId: string;
  trackingNo: string;
  status?: string;
  location?: string;
  note?: string;
  actorId?: string;
  actorName?: string;
  createdAt: string | Date;
};

// add/edit payloads
type PackageUpdate = Pick<
  Package,
  "tracking" | "courier" | "status" | "userEmail" | "suiteId" | "location"
> & { value: number; note?: string };

type PackageCreate = Omit<PackageUpdate, "note">;

// -------------------- Helpers --------------------
const s = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v);
};

function getRole(u: unknown): string | undefined {
  if (u && typeof u === "object" && "role" in u) {
    const r = (u as Record<string, unknown>).role;
    return typeof r === "string" ? r : undefined;
  }
  return undefined;
}

// normalize any status text to a canonical token for display/badges
const normStatusKey = (v?: string) =>
  (v || "").toLowerCase().replace(/[_]+/g, " ").trim();

const emptyForm = {
  tracking: "",
  courier: "",
  value: "",
  status: "Pending" as CanonicalStatus,
  userEmail: "",
  suiteId: "",
  location: "",
};

// -------------------- Component --------------------
export default function AdminPackagesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Data state
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // UI filters/sort/search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [suiteFilter, setSuiteFilter] = useState<string>("");
  const [sort, setSort] = useState("-createdAt"); // default newest first

  // Debounce search to avoid spamming API
  const [searchDebounced, setSearchDebounced] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Pagination
  const perPage = 8;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Add/Edit/Delete modals
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm, note: "" as string | undefined });
  const [editPkgId, setEditPkgId] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePkgId, setDeletePkgId] = useState<string | null>(null);

  // Billing
  const [billing, setBilling] = useState<{ open: boolean; packageId?: string; email?: string }>({ open: false });
  const [billAmount, setBillAmount] = useState<string>("");
  const [billDesc, setBillDesc] = useState<string>("Shipment charge");
  const [billingBusy, setBillingBusy] = useState(false);

  // Timeline
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineTracking, setTimelineTracking] = useState<string>("");
  const [timelineEvents, setTimelineEvents] = useState<TrackingEvent[]>([]);
  const [timelineError, setTimelineError] = useState<string>("");

  const [addEventOpen, setAddEventOpen] = useState(false);
  const [evForm, setEvForm] = useState({ packageId: "", trackingNo: "", status: "In Transit", location: "", note: "" });
  const [evBusy, setEvBusy] = useState(false);


  // Access control
  const role = getRole(session?.user);
  if (sessionStatus === "loading") return <div>Loading...</div>;
  if (sessionStatus === "unauthenticated" || !["admin", "superadmin"].includes(role ?? "")) {
    if (typeof window !== "undefined") router.push("/login");
    return <div>Redirecting...</div>;
  }

  // Fetch packages from server with filters/paging
  const refresh = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sort,
    });
    if (searchDebounced) params.set("search", searchDebounced);
    if (statusFilter) params.set("status", statusFilter);
    if (suiteFilter) params.set("suite", suiteFilter);

    fetch("/api/admin/packages?" + params.toString())
      .then((res) => res.json())
      .then((data) => {
        setPackages(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
        setPages(Number(data.pages || 1));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(refresh, [page, perPage, sort, searchDebounced, statusFilter, suiteFilter]);

  // The server already returns a page slice
  const paged = packages;
  const pageCount = Math.max(1, pages);

  // ---------- CRUD actions ----------
  async function addPackage() {
    if (!addForm.tracking || !addForm.courier || addForm.value === "" || isNaN(Number(addForm.value))) {
      toast.error("Please fill all required fields (and use a number for value)");
      return;
    }
    const payload: PackageCreate = {
      tracking: addForm.tracking,
      courier: addForm.courier,
      value: Number(addForm.value),
      status: addForm.status,
      userEmail: addForm.userEmail || undefined,
      suiteId: addForm.suiteId || undefined,
      location: addForm.location || undefined,
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
      setPage(1);
      refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string })?.error || "Failed to add package.");
    }
  }

  function openEdit(pkg: Package) {
    setEditForm({
      tracking: pkg.tracking,
      courier: pkg.courier,
      value: (pkg.value ?? 0).toString(),
      status: (pkg.status as CanonicalStatus) || "Pending",
      userEmail: pkg.userEmail || "",
      suiteId: pkg.suiteId || "",
      location: pkg.location || "",
      note: "",
    });
    setEditPkgId(pkg._id ?? null);
    setShowEdit(true);
  }

  async function updatePackage() {
    if (!editPkgId) return;
    const payload: PackageUpdate = {
      tracking: editForm.tracking,
      courier: editForm.courier,
      value: Number(editForm.value),
      status: editForm.status,
      userEmail: editForm.userEmail || undefined,
      suiteId: editForm.suiteId || undefined,
      location: editForm.location || undefined,
      note: editForm.note || undefined,
    };
    const res = await fetch(`/api/admin/packages/${editPkgId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Package updated!");
      setShowEdit(false);
      setEditPkgId(null);
      refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string })?.error || "Failed to update package.");
    }
  }

  async function deletePackage() {
    if (!deletePkgId) return;
    const res = await fetch(`/api/admin/packages/${deletePkgId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Package deleted!");
      setShowDelete(false);
      setDeletePkgId(null);
      // If we deleted the last item on this page, go back one page
      if (paged.length === 1 && page > 1) setPage((p) => p - 1);
      refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string })?.error || "Failed to delete package.");
    }
  }

  // ---------- Billing ----------
  async function billShipment() {
    if (!billing.open) return;
    const email = s(billing.email).trim();
    const amt = Number(billAmount);

    if (!email) return toast.error("Please provide the customer email.");
    if (!amt || isNaN(amt) || amt <= 0) return toast.error("Please enter a valid amount.");

    setBillingBusy(true);
    try {
      const res = await fetch("/api/admin/charges/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          amount: amt,
          currency: "AED",
          description: billDesc
            ? `${billDesc}${billing.packageId ? ` (Package ${billing.packageId})` : ""}`
            : `Charge${billing.packageId ? ` (Package ${billing.packageId})` : ""}`,
          method: { type: "card" },
          status: "pending",
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        data?: { invoiceNo?: string; payUrl?: string };
      };
      setBillingBusy(false);
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to create charge");
        return;
      }

      setBilling({ open: false });
      setBillAmount("");
      toast.success(`Invoice ${data.data?.invoiceNo ?? ""} created.`);

      if (data?.data?.payUrl) {
        const openNow = confirm("Open pay link now?");
        if (openNow) window.open(data.data.payUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      setBillingBusy(false);
      const msg = e instanceof Error ? e.message : "Failed to create charge";
      toast.error(msg);
    }
  }

  // ---------- Timeline ----------
  async function openTimeline(pkg: Package) {
    setTimelineError("");
    setTimelineEvents([]);
    setTimelineTracking(pkg.tracking);
    setTimelineOpen(true);
    if (!pkg._id) return;

    setTimelineLoading(true);
    try {
      const r = await fetch(`/api/tracking/events?packageId=${encodeURIComponent(pkg._id)}`);
      const j = (await r.json()) as { ok?: boolean; events?: TrackingEvent[]; error?: string };
      if (!r.ok || !j?.ok) {
        setTimelineError(j?.error || "Failed to load events");
      } else {
        setTimelineEvents(Array.isArray(j.events) ? j.events : []);
      }
    } catch (e) {
      setTimelineError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setTimelineLoading(false);
    }
  }

  // ---------- Status Badge ----------
  const renderStatusBadge = (status?: string) => {
    switch (normStatusKey(status)) {
      case "delivered":
        return <Badge bg="success">Delivered</Badge>;
      case "pending":
        return <Badge bg="warning">Pending</Badge>;
      case "problem":
        return <Badge bg="danger">Problem</Badge>;
      case "in transit":
        return <Badge bg="info">In Transit</Badge>;
      case "processing":
        return <Badge bg="secondary">Processing</Badge>;
      case "received":
        return <Badge bg="secondary">Received</Badge>;
      case "cancelled":
        return <Badge bg="dark">Cancelled</Badge>;
      case "shipped":
        return <Badge bg="primary">Shipped</Badge>;
      default:
        return <Badge bg="light" text="dark">{status || "—"}</Badge>;
    }
  };

  // ---------- Render ----------
  return (
    <AdminLayout>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 28 }}>
          Admin Packages Management
        </h1>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
          <Form.Control
            placeholder="Search by tracking, courier, email, status, suite or location"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ maxWidth: 360 }}
          />

          <Form.Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: 180 }}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Received">Received</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Forwarded">Forwarded</option>
            <option value="In Transit">In Transit</option>
          </Form.Select>

          <Form.Control
            placeholder="Suite (e.g., UAE 1234)"
            value={suiteFilter}
            onChange={(e) => { setSuiteFilter(e.target.value); setPage(1); }}
            style={{ maxWidth: 180 }}
          />

          <Form.Select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            style={{ width: 180 }}
          >
            <option value="-createdAt">Newest first</option>
            <option value="createdAt">Oldest first</option>
            <option value="tracking">Tracking ↑</option>
            <option value="-tracking">Tracking ↓</option>
            <option value="status">Status ↑</option>
            <option value="-status">Status ↓</option>
          </Form.Select>

          <Button variant="success" onClick={() => setShowAdd(true)}>
            + Add New Package
          </Button>
        </div>

        <div className="text-muted mb-2">
          {loading ? "Loading…" : `Showing ${paged.length} of ${total}`}
        </div>

        <Table hover responsive className="bg-white shadow-sm rounded">
          <thead>
            <tr>
              <th>Tracking #</th>
              <th>Courier</th>
              <th>Value</th>
              <th>User Email</th>
              <th>Suite</th>
              <th>Status</th>
              <th>Location</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><div className="d-flex align-items-center gap-2 p-3"><Spinner animation="border" size="sm" /> Loading…</div></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={10}>No packages found.</td></tr>
            ) : paged.map((pkg) => (
              <tr key={pkg._id}>
                <td>{pkg.tracking}</td>
                <td>{pkg.courier}</td>
                <td>{typeof pkg.value === "number" ? pkg.value : Number(pkg.value) || 0}</td>
                <td>{pkg.userEmail || "—"}</td>
                <td>{pkg.suiteId || "—"}</td>
                <td>{renderStatusBadge(pkg.status)}</td>
                <td>{pkg.location || "—"}</td>
                <td>{pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : "—"}</td>
                <td>{pkg.updatedAt ? new Date(pkg.updatedAt).toLocaleDateString() : "—"}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => openTimeline(pkg)}
                    >
                      Timeline
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() =>
                        setBilling({
                          open: true,
                          packageId: pkg._id,
                          email: pkg.userEmail || "",
                        })
                      }
                    >
                      <Button
  size="sm"
  variant="outline-success"
  onClick={() => {
    setEvForm({
      packageId: pkg._id || "",
      trackingNo: pkg.tracking,
      status: "In Transit",
      location: pkg.location || "",
      note: "",
    });
    setAddEventOpen(true);
  }}
>
  + Event
</Button>

                      Bill
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-warning"
                      onClick={() => openEdit(pkg)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => {
                        setShowDelete(true);
                        setDeletePkgId(pkg._id ?? null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        {/* Pagination */}
        <div className="d-flex justify-content-end align-items-center">
          <Pagination>
            <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
            <Pagination.Prev onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
            {Array.from({ length: pageCount }).map((_, i) => (
              <Pagination.Item
                key={i + 1}
                active={i + 1 === page}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} />
            <Pagination.Last onClick={() => setPage(pageCount)} disabled={page === pageCount} />
          </Pagination>
        </div>
      </div>

      {/* Add Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Package</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tracking Number*</Form.Label>
              <Form.Control
                value={addForm.tracking}
                onChange={(e) => setAddForm((f) => ({ ...f, tracking: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Courier*</Form.Label>
              <Form.Control
                value={addForm.courier}
                onChange={(e) => setAddForm((f) => ({ ...f, courier: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value (USD)*</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={addForm.value}
                onChange={(e) => setAddForm((f) => ({ ...f, value: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Email</Form.Label>
              <Form.Control
                type="email"
                value={addForm.userEmail}
                onChange={(e) => setAddForm((f) => ({ ...f, userEmail: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Suite ID</Form.Label>
              <Form.Control
                placeholder="e.g., UAE 1234"
                value={addForm.suiteId}
                onChange={(e) => setAddForm((f) => ({ ...f, suiteId: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={addForm.status}
                onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value as CanonicalStatus }))}
              >
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Forwarded">Forwarded</option>
                <option value="In Transit">In Transit</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Location (optional)</Form.Label>
              <Form.Control
                placeholder="e.g., Dubai Hub"
                value={addForm.location}
                onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))}
              />
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

      {/* Edit Modal */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Package</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tracking Number*</Form.Label>
              <Form.Control
                value={editForm.tracking}
                onChange={(e) => setEditForm((f) => ({ ...f, tracking: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Courier*</Form.Label>
              <Form.Control
                value={editForm.courier}
                onChange={(e) => setEditForm((f) => ({ ...f, courier: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Value (USD)*</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={editForm.value}
                onChange={(e) => setEditForm((f) => ({ ...f, value: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>User Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.userEmail}
                onChange={(e) => setEditForm((f) => ({ ...f, userEmail: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Suite ID</Form.Label>
              <Form.Control
                value={editForm.suiteId}
                onChange={(e) => setEditForm((f) => ({ ...f, suiteId: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CanonicalStatus }))}
              >
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Forwarded">Forwarded</option>
                <option value="In Transit">In Transit</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Current Location</Form.Label>
              <Form.Control
                placeholder="e.g., Dubai Hub"
                value={editForm.location}
                onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Note (timeline)</Form.Label>
              <Form.Control
                placeholder="Optional message for the tracking timeline"
                value={editForm.note || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
              />
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
          <Modal.Title>Delete Package</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this package?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deletePackage}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Billing Modal */}
      <Modal show={billing.open} onHide={() => setBilling({ open: false })} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Charge</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>User email</Form.Label>
              <Form.Control
                value={billing.email || ""}
                onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
                placeholder="user@example.com"
              />
              <div className="form-text">Pre-filled from the package. You can adjust if needed.</div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount (AED)</Form.Label>
              <InputGroup>
                <InputGroup.Text>AED</InputGroup.Text>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.01"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                />
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-0">
              <Form.Label>Description</Form.Label>
              <Form.Control
                value={billDesc}
                onChange={(e) => setBillDesc(e.target.value)}
                placeholder="e.g., Shipment charge"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={billingBusy} onClick={() => setBilling({ open: false })}>
            Cancel
          </Button>
          <Button variant="primary" disabled={billingBusy} onClick={billShipment}>
            {billingBusy ? "Creating…" : "Create Pay Link"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Timeline Modal */}
      <Modal show={timelineOpen} onHide={() => setTimelineOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Timeline — {timelineTracking || "Package"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {timelineLoading && (
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" /> Loading events…
            </div>
          )}

          {!timelineLoading && timelineError && (
            <Alert variant="danger" className="mb-0">{timelineError}</Alert>
          )}

          {!timelineLoading && !timelineError && timelineEvents.length === 0 && (
            <div className="text-muted">No events yet.</div>
          )}

          {!timelineLoading && !timelineError && timelineEvents.length > 0 && (
            <Table hover responsive size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Note</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {timelineEvents.map((ev) => (
                  <tr key={ev._id}>
                    <td>{new Date(ev.createdAt).toLocaleString()}</td>
                    <td>{ev.status || "—"}</td>
                    <td>{ev.location || "—"}</td>
                    <td>{ev.note || "—"}</td>
                    <td>{ev.actorName || ev.actorId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={addEventOpen} onHide={() => setAddEventOpen(false)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Add Tracking Event</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      <Form.Group className="mb-3">
        <Form.Label>Status</Form.Label>
        <Form.Select
          value={evForm.status}
          onChange={(e) => setEvForm((f) => ({ ...f, status: e.target.value }))}
        >
          <option>Pending</option>
          <option>Received</option>
          <option>Processing</option>
          <option>Shipped</option>
          <option>In Transit</option>
          <option>Delivered</option>
          <option>Cancelled</option>
          <option>Forwarded</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Location</Form.Label>
        <Form.Control
          placeholder="e.g., Dubai Hub"
          value={evForm.location}
          onChange={(e) => setEvForm((f) => ({ ...f, location: e.target.value }))}
        />
      </Form.Group>
      <Form.Group className="mb-0">
        <Form.Label>Note</Form.Label>
        <Form.Control
          placeholder="Optional message"
          value={evForm.note}
          onChange={(e) => setEvForm((f) => ({ ...f, note: e.target.value }))}
        />
      </Form.Group>
    </Form>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" disabled={evBusy} onClick={() => setAddEventOpen(false)}>
      Cancel
    </Button>
    <Button
      variant="success"
      disabled={evBusy}
      onClick={async () => {
        if (!evForm.packageId || !evForm.trackingNo) return;
        setEvBusy(true);
        try {
          const r = await fetch("/api/tracking/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(evForm),
          });
          const j = await r.json();
          if (!r.ok || !j?.ok) {
            throw new Error(j?.error || "Failed to add event");
          }
          setAddEventOpen(false);
          setEvBusy(false);
          // optimistic refresh timeline if it's open on same package
          toast.success("Event added");
          refresh();
        } catch (e) {
          setEvBusy(false);
          toast.error(e instanceof Error ? e.message : "Failed to add event");
        }
      }}
    >
      {evBusy ? "Saving…" : "Save Event"}
    </Button>
  </Modal.Footer>
</Modal>

    </AdminLayout>
  );
}
