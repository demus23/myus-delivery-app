import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Form, Row, Col, Button, Table, Alert, InputGroup } from "react-bootstrap";

type Props = { show: boolean; onHide: () => void };

type Quote = {
  carrier: string;
  service?: string;
  currency?: string;        // default AED
  chargeableKg: number;
  total: number;
  breakdown?: Record<string, number>;
};

export default function ShippingCalc({ show, onHide }: Props) {
  // form state
  const [from, setFrom] = useState("United Arab Emirates");
  const [to, setTo] = useState("United Kingdom");
  const [uom, setUom] = useState<"kg" | "lb">("kg");
  const [weight, setWeight] = useState<string>("1");
  const [L, setL] = useState<string>("");
  const [W, setW] = useState<string>("");
  const [H, setH] = useState<string>("");
  const [speed, setSpeed] = useState<"standard" | "express">("standard");
  const [carriers, setCarriers] = useState<{ DHL: boolean; Aramex: boolean; UPS: boolean }>({
    DHL: true,
    Aramex: true,
    UPS: true,
  });
  const [remote, setRemote] = useState(false);
  const [useInsurance, setUseInsurance] = useState(false);
  const [insuranceAED, setInsuranceAED] = useState<string>("34");

  // results state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  // helpers
  const actualKg = useMemo(() => {
    const n = Number(weight);
    if (!isFinite(n) || n <= 0) return 0;
    return uom === "kg" ? n : n * 0.45359237;
  }, [weight, uom]);

  const volumetricKg = useMemo(() => {
    const l = Number(L) || 0;
    const w = Number(W) || 0;
    const h = Number(H) || 0;
    if (!l || !w || !h) return 0;
    return (l * w * h) / 5000; // divisior 5000
  }, [L, W, H]);

  const chargeableKg = useMemo(() => Math.max(actualKg, volumetricKg), [actualKg, volumetricKg]);

  function toggleCarrier(name: keyof typeof carriers) {
    setCarriers((c) => ({ ...c, [name]: !c[name] }));
  }

  async function getQuotes() {
    setBusy(true);
    setError(null);
    setQuotes([]);

    try {
      // very light validation
      if (!from || !to) throw new Error("From and To are required");
      const weightKg = actualKg;
      if (!weightKg || weightKg <= 0) throw new Error("Weight must be a positive number");

      const selectedCarriers = (Object.entries(carriers) as [keyof typeof carriers, boolean][])
        .filter(([, v]) => v)
        .map(([k]) => k);

      const r = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          uom,                         // server can ignore if unwanted
          weightKg,                    // normalized to KG
          lengthCM: Number(L) || undefined,
          widthCM: Number(W) || undefined,
          heightCM: Number(H) || undefined,
          speed,
          carriers: selectedCarriers,  // ["DHL","Aramex","UPS"]
          insuranceAED: useInsurance ? Number(insuranceAED) || 0 : 0,
          remoteArea: remote,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        throw new Error(data?.error || `Request failed (${r.status})`);
      }

      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
      // scroll results into view so you see them under the button
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to get quotes";
  setError(msg);
 
    } finally {
      setBusy(false);
    }
  }

  // reset when modal opens/closes
  useEffect(() => {
    if (!show) {
      setError(null);
      setQuotes([]);
    }
  }, [show]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Shipping Calculator</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Row className="g-3">
          <Col md={6}>
            <Form.Label>From</Form.Label>
            <Form.Select value={from} onChange={(e) => setFrom(e.target.value)}>
              <option>United Arab Emirates</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Saudi Arabia</option>
              <option>India</option>
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label>To</Form.Label>
            <Form.Select value={to} onChange={(e) => setTo(e.target.value)}>
              <option>United Arab Emirates</option>
              <option>United States</option>
              <option>United Kingdom</option>
              <option>Saudi Arabia</option>
              <option>India</option>
            </Form.Select>
          </Col>

          <Col md={6}>
            <Form.Label>Weight</Form.Label>
            <InputGroup>
              <Form.Control
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1"
                inputMode="decimal"
              />
              <Form.Select value={uom} onChange={(e) => setUom(e.target.value as any)} style={{ maxWidth: 110 }}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </Form.Select>
            </InputGroup>
            <div className="form-text">
              Chargeable = max(actual, volumetric). Volumetric divisor: 5000
            </div>
          </Col>

          <Col md={2}>
            <Form.Label>L (cm)</Form.Label>
            <Form.Control value={L} onChange={(e) => setL(e.target.value)} />
          </Col>
          <Col md={2}>
            <Form.Label>W (cm)</Form.Label>
            <Form.Control value={W} onChange={(e) => setW(e.target.value)} />
          </Col>
          <Col md={2}>
            <Form.Label>H (cm)</Form.Label>
            <Form.Control value={H} onChange={(e) => setH(e.target.value)} />
          </Col>

          <Col md={12}>
            <Form.Label>Speed</Form.Label>
            <div>
              <Form.Check
                inline
                name="speed"
                type="radio"
                id="spd-std"
                label="Standard"
                checked={speed === "standard"}
                onChange={() => setSpeed("standard")}
              />
              <Form.Check
                inline
                name="speed"
                type="radio"
                id="spd-exp"
                label="Express"
                checked={speed === "express"}
                onChange={() => setSpeed("express")}
              />
            </div>
          </Col>

          <Col md={12}>
            <Form.Label>Carriers</Form.Label>
            <div>
              <Form.Check
                inline
                label="DHL"
                checked={carriers.DHL}
                onChange={() => toggleCarrier("DHL")}
              />
              <Form.Check
                inline
                label="Aramex"
                checked={carriers.Aramex}
                onChange={() => toggleCarrier("Aramex")}
              />
              <Form.Check
                inline
                label="UPS"
                checked={carriers.UPS}
                onChange={() => toggleCarrier("UPS")}
              />
              <Form.Check
                inline
                type="checkbox"
                label="Remote area (+35 AED)"
                checked={remote}
                onChange={(e) => setRemote(e.currentTarget.checked)}
                className="ms-3"
              />
            </div>
          </Col>

          <Col md={12}>
            <Form.Check
              type="checkbox"
              label="Add insurance"
              checked={useInsurance}
              onChange={(e) => setUseInsurance(e.currentTarget.checked)}
            />
            <InputGroup className="mt-2">
              <InputGroup.Text>AED</InputGroup.Text>
              <Form.Control
                value={insuranceAED}
                onChange={(e) => setInsuranceAED(e.target.value)}
                disabled={!useInsurance}
                placeholder="Declared value"
              />
            </InputGroup>
            <div className="form-text">0.5% of value, min 10 AED</div>
          </Col>
        </Row>

        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}

        {quotes.length > 0 && (
          <div ref={resultsRef} className="mt-3">
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Carrier</th>
                  <th>Service</th>
                  <th>Chargeable (kg)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q, i) => (
                  <tr key={i}>
                    <td>{q.carrier}</td>
                    <td>{q.service || (speed === "express" ? "Express" : "Standard")}</td>
                    <td>{q.chargeableKg.toFixed(2)}</td>
                    <td>
                      {q.total.toFixed(2)} {q.currency || "AED"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="me-auto small text-muted">
          Chargeable now: {chargeableKg ? chargeableKg.toFixed(2) : "—"} kg
        </div>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button onClick={getQuotes} disabled={busy}>
          {busy ? "Fetching…" : "Get Quotes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
