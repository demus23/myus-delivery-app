import { useState } from "react";
import { Button, Modal, Form, InputGroup, Table, Spinner, Alert, Badge } from "react-bootstrap";

type Speed = "standard" | "express";
type Carrier = "DHL" | "Aramex" | "UPS";

type Quote = {
  carrier: Carrier;
  speed: Speed;
  priceAED: number;
  etaDays?: number;
  chargeableKg?: number;
  breakdown?: Record<string, number>;
};

type Draft = {
  from: { country: string };
  to: { country: string; postcode?: string };
  weightKg: number;
  dims?: { L?: number; W?: number; H?: number };
  speed: Speed;
  currency?: string;
  quotes: Quote[];
  selected: Quote;
};

function prettyMoney(aed: number) {
  return `AED ${Number(aed || 0).toFixed(2)}`;
}

async function saveDraftAndGo(draft: Draft) {
  const pid = `q-${Date.now()}`;
  const key = `ship:draft:${pid}`;
  const payload = { pid, draft, ts: Date.now() };

  try {
    // Save in both local & session storage (helps across reloads/HMR)
    localStorage.setItem(key, JSON.stringify(draft));
    localStorage.setItem("ship:draft:current", JSON.stringify(payload));
    sessionStorage.setItem(key, JSON.stringify(draft));
    sessionStorage.setItem("ship:draft:current", JSON.stringify(payload));
  } catch {}

  // NEW: also save to a tiny server-side store for extra safety
  try {
    await fetch("/api/shipments/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pid, draft }),
    });
  } catch {
    // not fatal; we still have local/session storage
  }

  window.location.assign(`/shipments/new?pid=${encodeURIComponent(pid)}`);
}

export default function UserShippingQuoteButton({ label = "Shipping Calculator" }: { label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button variant="outline-primary" onClick={() => setShow(true)}>{label}</Button>
      {show && <QuoteModal show={show} onHide={() => setShow(false)} />}
    </>
  );
}

function QuoteModal({ show, onHide }: { show: boolean; onHide: () => void }) {
  const [from, setFrom] = useState("United Arab Emirates");
  const [to, setTo] = useState("United Kingdom");
  const [postcode, setPostcode] = useState("");
  const [currency, setCurrency] = useState("AED");

  const [weight, setWeight] = useState("1");
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [speed, setSpeed] = useState<Speed>("standard");

  const [L, setL] = useState("");
  const [W, setW] = useState("");
  const [H, setH] = useState("");

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function weightToKg() {
    const n = Number(weight);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return unit === "kg" ? n : n * 0.45359237;
  }

  async function getQuotes() {
    setErr(null);
    setQuotes([]);
    setSelectedIdx(0);

    const weightKg = weightToKg();
    if (!from || !to) return setErr("From and To are required");
    if (!(weightKg > 0)) return setErr("Weight must be a positive number");

    setLoading(true);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          postcode: postcode || undefined,
          weightKg,
          dims: {
            L: L ? Number(L) : undefined,
            W: W ? Number(W) : undefined,
            H: H ? Number(H) : undefined,
          },
          carriers: { DHL: true, Aramex: true, UPS: true },
          speed,
          currency,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const normalized: Quote[] = (data.quotes || []).map((q: any) => ({
        carrier: q.carrier,
        speed: (q.speed || "standard") as Speed,
        priceAED: Number(q.priceAED ?? q.costAED ?? 0),
        etaDays: q.etaDays ?? q.transitDays ?? undefined,
        chargeableKg: q.chargeableKg ?? undefined,
        breakdown: q.breakdown ?? undefined,
      }));

      setQuotes(normalized);
      setSelectedIdx(0);
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to get quotes";
  setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function proceed() {
    if (!quotes.length) return;
    const draft: Draft = {
      from: { country: from },
      to: { country: to, postcode: postcode || undefined },
      weightKg: weightToKg(),
      dims: {
        L: L ? Number(L) : undefined,
        W: W ? Number(W) : undefined,
        H: H ? Number(H) : undefined,
      },
      speed,
      currency,
      quotes,
      selected: quotes[selectedIdx], // ensure selected is set
    };
    saveDraftAndGo(draft);
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Shipping Calculator</Modal.Title></Modal.Header>
      <Modal.Body>
        <div className="row g-2">
          <div className="col-md-6"><Form.Label>From</Form.Label><Form.Control value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="col-md-6"><Form.Label>To</Form.Label><Form.Control value={to} onChange={(e) => setTo(e.target.value)} /></div>

          <div className="col-md-6"><Form.Label>Postcode (opt.)</Form.Label><Form.Control value={postcode} onChange={(e) => setPostcode(e.target.value)} /></div>
          <div className="col-md-6">
            <Form.Label>Currency</Form.Label>
            <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </Form.Select>
          </div>

          <div className="col-md-6">
            <Form.Label>Weight</Form.Label>
            <InputGroup>
              <Form.Control value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Form.Select value={unit} onChange={(e) => setUnit(e.target.value as "kg" | "lb")}>
                <option value="kg">kg</option><option value="lb">lb</option>
              </Form.Select>
            </InputGroup>
            <small className="text-muted">Chargeable = max(actual, volumetric)</small>
          </div>

          <div className="col-md-6">
            <Form.Label>Speed</Form.Label>
            <div className="d-flex gap-2">
              <Button size="sm" variant={speed === "standard" ? "primary" : "outline-primary"} onClick={() => setSpeed("standard")}>Standard</Button>
              <Button size="sm" variant={speed === "express" ? "primary" : "outline-primary"} onClick={() => setSpeed("express")}>Express</Button>
            </div>
          </div>

          <div className="col-md-4"><Form.Label>L (cm)</Form.Label><Form.Control value={L} onChange={(e) => setL(e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>W (cm)</Form.Label><Form.Control value={W} onChange={(e) => setW(e.target.value)} /></div>
          <div className="col-md-4"><Form.Label>H (cm)</Form.Label><Form.Control value={H} onChange={(e) => setH(e.target.value)} /></div>
        </div>

        {err && <Alert variant="danger" className="mt-3">{err}</Alert>}

        <div className="d-flex align-items-center gap-2 mt-3">
          <Button onClick={getQuotes} disabled={loading}>{loading ? <Spinner size="sm" /> : "Get Quotes"}</Button>
          {!!quotes.length && <Badge bg="light" text="dark">{quotes.length} options</Badge>}
        </div>

        {!!quotes.length && (
          <Table hover size="sm" className="mt-3">
            <thead><tr><th>Carrier</th><th>Service</th><th>ETA</th><th className="text-end">Price</th></tr></thead>
            <tbody>
              {quotes.map((q, i) => (
                <tr key={i} onClick={() => setSelectedIdx(i)} style={{ cursor: "pointer" }} className={i === selectedIdx ? "table-primary" : ""}>
                  <td>{q.carrier}</td><td>{q.speed}</td><td>{q.etaDays ? `${q.etaDays} days` : "—"}</td><td className="text-end">{prettyMoney(q.priceAED)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        <Button onClick={proceed} disabled={!quotes.length}>Proceed</Button>
      </Modal.Footer>
    </Modal>
  );
}
