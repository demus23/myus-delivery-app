// pages/admin/users/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Container, Row, Col, Card, Badge, Button, Form, Spinner, Alert } from "react-bootstrap";
import Link from "next/link";
import { api } from "@/lib/api";
import AddressManager from "@/components/AddressManager";
import DocumentUploader from "@/components/DocumentUploader";
import ActivityLogPanel from "@/components/admin/users/ActivityLogPanel";


type Address = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};
type PaymentMethod = {
  id?: string;
  _id?: string;
  type: string;
  details: string;
  isDefault?: boolean;
};
type DocumentFile = {
  label: string;
  filename: string;
  url?: string;
  uploadedAt?: string;
};
type AdminUser = {
  id: string; // prefer this, but we’ll also handle _id from API
  name: string;
  email: string;
  role: string;
  membership: string;
  phone?: string;
  suiteId?: string | null;
  subscribed?: boolean;
  emailVerified?: boolean;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  documents: DocumentFile[];
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminUserDetail() {
  const router = useRouter();
  const { id } = router.query;

 const { data: sess } = useSession();
 const isSuper = sess?.user?.role === "superadmin";

  const [user, setUser] = useState<AdminUser | (AdminUser & { _id?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suiteBusy, setSuiteBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<Partial<AdminUser>>({});
  const get = (obj: unknown, path: string[]): unknown => {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== "object" || cur === null || !(key in cur)) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
};

  // ---------- load user ----------
  useEffect(() => {
    const routeId = Array.isArray(id) ? id[0] : (id as string | undefined);
    if (!routeId) return;

    (async () => {
      try {
        setLoading(true);
        const r = await api.get<{ user: AdminUser & { _id?: string } }>(`/admin/users/${routeId}`);
        setUser(r.data.user);
        setForm({
          name: r.data.user.name,
          phone: r.data.user.phone,
          membership: r.data.user.membership,
          role: r.data.user.role,
          suiteId: r.data.user.suiteId ?? "",
          subscribed: !!r.data.user.subscribed,
        });
      } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to load user";
  setError(msg);

      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------- resolve a reliable userId everywhere ----------
  const routeUserId = Array.isArray(id) ? id[0] : (id as string | undefined);
  const resolvedUserId =
    (user?.id as string | undefined) ||
    ((user as any)?._id as string | undefined) ||
    routeUserId ||
    "";

  // ---------- refresh helper ----------
  async function refreshUser() {
    const routeId = Array.isArray(id) ? id[0] : (id as string | undefined);
    if (!routeId) return;

    const r = await api.get<{ user: AdminUser & { _id?: string } }>(`/admin/users/${routeId}`);
    setUser(r.data.user);
    setForm({
      name: r.data.user.name,
      phone: r.data.user.phone,
      membership: r.data.user.membership,
      role: r.data.user.role,
      suiteId: r.data.user.suiteId ?? "",
      subscribed: !!r.data.user.subscribed,
    });
  }

  // ---------- suite regenerate ----------
  async function regenerateSuite() {
    if (!resolvedUserId) return;
    try {
      setSuiteBusy(true);
      await api.post(`/admin/users/${resolvedUserId}/suite`);
      await refreshUser();
    } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to regenerate suite";
  setError(msg); 
    } finally {
      setSuiteBusy(false);
    }
  }

  // ---------- save profile ----------
  const save = async () => {
    if (!routeUserId) return;
    try {
      setSaving(true);
      await api.put(`/admin/users/${routeUserId}`, {
        name: form.name,
        phone: form.phone,
        membership: form.membership,
        role: form.role,
        suiteId: form.suiteId || null,
        subscribed: !!form.subscribed,
      });
      await refreshUser();
    } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to save";
  setError(msg);   
    } finally {
      setSaving(false);
    }
  };

  // ---------- resend verification (robust: tries userId endpoint first, then email-based) ----------
  async function resendVerification() {
    try {
      setSaving(true);
      setError("");

      if (resolvedUserId) {
        const r1 = await fetch("/api/auth/email/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: resolvedUserId }),
        });
        if (r1.ok) {
          alert("Verification email sent.");
          return;
        }
      }

      if (user?.email) {
        const r2 = await fetch("/api/auth/email/request-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        if (r2.ok) {
          alert("Verification email sent.");
          return;
        }
      }

      throw new Error("Failed to resend verification email");
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Could not resend verification email";
  setError(msg);  
    } finally {
      setSaving(false);
    }
  }

  // ---------- Payment Admin Handlers ----------
  async function addPaymentAdmin() {
    if (!resolvedUserId) return;
    const type = prompt("Type (card/paypal/wire)", "card") || "card";
    const details = prompt("Details (****4242 / email / IBAN)") || "";
    if (!details) return;
    const isDefault = confirm("Make this the default method?");
    try {
      setPayBusy(true);
      await api.post(`/admin/users/${resolvedUserId}/payments`, {
        type,
        details,
        isDefault,
      });
      await refreshUser();
     } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to add payment method"
  alert(msg);  
    } finally {
      setPayBusy(false);
    }
  }

  async function deletePaymentAdmin(mid: string) {
    if (!resolvedUserId) return;
    if (!confirm("Remove this payment method?")) return;
    try {
      setPayBusy(true);
      await api.request({
        url: `/admin/users/${resolvedUserId}/payments`,
        method: "DELETE",
        data: { id: mid },
      });
      await refreshUser();
     } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to delete payment method";
  alert(msg);   
    } finally {
      setPayBusy(false);
    }
  }

  async function setDefaultPaymentAdmin(mid: string) {
    if (!resolvedUserId) return;
    try {
      setPayBusy(true);
      await api.put(`/admin/users/${resolvedUserId}/payments`, {
        id: mid,
        makeDefault: true,
      });
      await refreshUser();
   } catch (e: unknown) {
  const apiErr = get(e, ["response", "data", "error"]);
  const msg =
    (typeof apiErr === "string" && apiErr) ||
    (e instanceof Error ? e.message : "") ||
    "Failed to set default"
  alert(msg); 
    } finally {
      setPayBusy(false);
    }
  }

  // ---------- render ----------
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 240 }}>
        <Spinner animation="border" />
      </div>
    );
  }

  if (!user) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || "User not found"}</Alert>
        <Link href="/admin/users" className="btn btn-outline-secondary mt-2">
          Back
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="mb-0">User: {user.name}</h3>
        <Link href="/admin/users" className="btn btn-outline-secondary">
          Back
        </Link>
      </div>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Row className="g-3">
        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Header>
              <strong>Profile</strong>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={form.name ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Col>

                <Col md={6}>
                  <Form.Label>
                    Email{" "}
                    {user.emailVerified ? (
                      <Badge bg="success" className="ms-2">
                        Verified
                      </Badge>
                    ) : (
                      <Badge bg="secondary" className="ms-2">
                        Unverified
                      </Badge>
                    )}
                  </Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control value={user.email} disabled />
                    {!user.emailVerified && (
                      <Button variant="outline-secondary" onClick={resendVerification}>
                        Resend
                      </Button>
                    )}
                  </div>
                </Col>

                <Col md={6}>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    value={form.phone ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </Col>

                <Col md={6}>
                  <Form.Label>Suite ID</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      value={form.suiteId ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, suiteId: e.target.value }))}
                      pattern="UAE-\d{5}"
                      title="Format: UAE-12345"
                      placeholder="e.g., AE-7F2K-9Q"
                    />
                    <Button
                      variant="outline-primary"
                      onClick={regenerateSuite}
                      disabled={suiteBusy || !resolvedUserId}
                      title="Generate a new unique suite"
                    >
                      {suiteBusy ? <Spinner size="sm" /> : "Regenerate"}
                    </Button>
                  </div>
                </Col>

                <Col md={6}>
                  <Form.Label>Membership</Form.Label>
                  <Form.Select
                    value={form.membership ?? "Free"}
                    onChange={(e) => setForm((f) => ({ ...f, membership: e.target.value }))}
                  >
                    <option>Free</option>
                    <option>Premium</option>
                    <option>Pro</option>
                  </Form.Select>
                </Col>

                <Col md={6}>
                  <Form.Label>Role</Form.Label>
                  <Form.Select
                    value={form.role ?? "user"}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    disabled={!isSuper}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    {isSuper && <option value="superadmin">Super Admin</option>}
                  </Form.Select>
                  {!isSuper && (
                    <div className="form-text">Only superadmins can change roles.</div>
                    )}
                </Col>

                <Col md={6}>
                  <Form.Check
                    className="mt-2"
                    type="checkbox"
                    label="Marketing Subscribed"
                    checked={!!form.subscribed}
                    onChange={(e) => setForm((f) => ({ ...f, subscribed: e.target.checked }))}
                  />
                </Col>
              </Row>

              <div className="mt-3">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Spinner size="sm" /> : "Save Changes"}
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm mt-3">
            <Card.Header>
              <strong>Address Book</strong>
            </Card.Header>
            <Card.Body>
              {!resolvedUserId ? (
                <div className="text-muted small">Loading user id…</div>
              ) : (
                <AddressManager
                  userId={resolvedUserId}
                  admin
                  addresses={user.addresses || []}
                  onChanged={refreshUser}
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Header>
              <strong>Payment Methods</strong>
            </Card.Header>
            <Card.Body>
              {(user.paymentMethods ?? []).length === 0 ? (
                <div className="text-muted">No saved methods.</div>
              ) : (
                <ul className="list-group">
                  {(user.paymentMethods ?? []).map((m, idx) => {
                    const mid = String(m._id || m.id || idx);
                    return (
                      <li
                        key={mid}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span>
                          <Badge bg="light" text="dark" className="me-2">
                            {m.type.toUpperCase()}
                          </Badge>
                          {m.details}{" "}
                          {m.isDefault && (
                            <Badge bg="success" className="ms-2">
                              Default
                            </Badge>
                          )}
                        </span>
                        <span className="d-flex gap-2">
                          {!m.isDefault && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => setDefaultPaymentAdmin(mid)}
                              disabled={payBusy || !resolvedUserId}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => deletePaymentAdmin(mid)}
                            disabled={payBusy || !resolvedUserId}
                          >
                            Remove
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button className="mt-2" size="sm" onClick={addPaymentAdmin} disabled={payBusy || !resolvedUserId}>
                {payBusy ? <Spinner size="sm" /> : "Add Payment Method"}
              </Button>
            </Card.Body>
          </Card>

            <Card className="shadow-sm mt-3">
              <Card.Header>
                <strong>Documents</strong>
              </Card.Header>
              <Card.Body>
                {!resolvedUserId ? (
                  <div className="text-muted small">Loading user id…</div>
                ) : (
                  <DocumentUploader
                    list={user.documents as any}
                    uploadUrl={`/api/admin/users/${resolvedUserId}/documents`}
                    onChange={refreshUser}
                    title="Documents (Admin)"
                  />
                )}
              </Card.Body>
            </Card>

          <Card className="shadow-sm mt-3">
            <Card.Header>
              <strong>Meta</strong>
            </Card.Header>
            <Card.Body className="small text-muted">
              <div>
                Created: {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
              </div>
              <div>
                Updated: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "-"}
              </div>
              <div>
                Suite: <Badge bg="info">{user.suiteId || "—"}</Badge>
              </div>
              <div>
                Membership: <Badge bg="success">{user.membership}</Badge>
              </div>
              <div>
                Role: <Badge bg="secondary">{user.role}</Badge>
              </div>
            </Card.Body>
          </Card>
          {resolvedUserId && <ActivityLogPanel userId={resolvedUserId} />}
        </Col>
      </Row>
    </Container>
  );
}
