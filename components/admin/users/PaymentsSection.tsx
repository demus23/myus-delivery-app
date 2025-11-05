import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Row, Spinner, Table, Badge, ButtonGroup } from "react-bootstrap";

type PaymentMethod = {
  id?: string;         // our client id (may exist)
  _id?: string;        // mongo subdoc id
  type: "card" | "paypal" | "wire" | string;
  details: string;
  isDefault?: boolean;
};

type Props = { userId: string };

export default function PaymentsSection({ userId }: Props) {
  const endpoint = useMemo(() => `/api/admin/users/${userId}/payments`, [userId]);

  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState<string>("");

  // add form
  const [type, setType] = useState<"card" | "paypal" | "wire">("card");
  const [details, setDetails] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const keyFor = (m: PaymentMethod) => String(m.id || m._id);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(endpoint);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to load payment methods");
      setMethods(j.methods || []);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load";
  setError(msg); 
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) {
      setError("Please enter details.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details: details.trim(), isDefault }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to add payment method");
      setMethods(j.methods || []);
      // reset form
      setDetails("");
      setIsDefault(false);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to add";
  setError(msg);  
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(mid: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mid, makeDefault: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to set default");
      setMethods(j.methods || []);
     } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to set default";
  setError(msg);  
    } finally {
      setBusy(false);
    }
  }

  async function remove(mid: string) {
    if (!confirm("Delete this payment method?")) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mid }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to delete");
      setMethods(j.methods || []);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to delete";
  setError(msg);   
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Payment Methods</strong>
          <div className="text-muted small">Add, set default, or delete</div>
        </div>
        <div>{(loading || busy) && <Spinner animation="border" size="sm" />}</div>
      </Card.Header>

      <Card.Body>
        {error && <div className="text-danger mb-3 small">{error}</div>}

        {/* Add simple form */}
        <Form onSubmit={addMethod} className="mb-4">
          <Row className="g-2">
            <Col sm={3}>
              <Form.Label className="mb-1">Type</Form.Label>
              <Form.Select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={busy}
              >
                <option value="card">Card</option>
                <option value="paypal">PayPal</option>
                <option value="wire">Wire</option>
              </Form.Select>
            </Col>
            <Col sm={7}>
              <Form.Label className="mb-1">Details (masked)</Form.Label>
              <Form.Control
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={
                  type === "card"
                    ? "visa **** 4242 exp 12/27"
                    : type === "paypal"
                    ? "customer@example.com"
                    : "IBAN AE07 **** **** ****"
                }
                disabled={busy}
              />
              <Form.Text className="text-muted">
                Store only masked/summary info (no full PAN/IBAN).
              </Form.Text>
            </Col>
            <Col sm={2} className="d-flex align-items-end">
              <div className="w-100">
                <Form.Check
                  type="checkbox"
                  label="Default"
                  className="mb-2"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  disabled={busy}
                />
                <Button type="submit" disabled={busy} className="w-100">
                  Add
                </Button>
              </div>
            </Col>
          </Row>
        </Form>

        {/* List */}
        {loading ? (
          <div className="d-flex align-items-center">
            <Spinner animation="border" size="sm" className="me-2" /> Loading…
          </div>
        ) : methods.length === 0 ? (
          <div className="text-muted">No payment methods yet.</div>
        ) : (
          <Table bordered hover responsive size="sm" className="align-middle">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Type</th>
                <th>Details</th>
                <th style={{ width: 120 }}>Default</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => {
                const id = keyFor(m);
                return (
                  <tr key={id}>
                    <td className="text-capitalize">{m.type}</td>
                    <td className="text-truncate" style={{ maxWidth: 500 }} title={m.details}>
                      {m.details?.length > 100 ? m.details.slice(0, 100) + "…" : m.details}
                    </td>
                    <td>{m.isDefault ? <Badge bg="success">Default</Badge> : <span className="text-muted">—</span>}</td>
                    <td>
                      <ButtonGroup>
                        {!m.isDefault && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => setDefault(id)}
                            disabled={busy}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => remove(id)}
                          disabled={busy}
                        >
                          Delete
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
