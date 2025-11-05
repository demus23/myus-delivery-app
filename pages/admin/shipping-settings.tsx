// pages/admin/shipping-settings.tsx
import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Table, Button, Form, Card, Spinner, Row, Col } from "react-bootstrap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

type Lane = {
  from: string;
  to: string;
  minChargeKg: number;
  incrementStepKg: number;
  base: number;
  perKgAfterMin: number;
  fuelPct: number;
  intlSurcharge: number;
};

type Settings = {
  currency: string;
  minChargeKg: number;
  incrementStepKg: number;
  base: number;
  perKgAfterMin: number;
  fuelPct: number;
  intlSurcharge: number;
  divisor: number;
  insurancePct: number;
  remoteAreaFee: number;
  lanes: Lane[];
};

export default function ShippingSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/admin/shipping/settings")
      .then((r) => r.json())
      .then((d) => setS(d.settings))
      .finally(() => setLoading(false));
  }, []);

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  const up = (k: keyof Settings, v: any) => setS((old) => (old ? { ...old, [k]: v } : old));
  const upLane = (i: number, k: keyof Lane, v: any) =>
    setS((old) =>
      old
        ? { ...old, lanes: old.lanes.map((ln, idx) => (idx === i ? { ...ln, [k]: v } : ln)) }
        : old
    );

  const addLane = () =>
    setS((old) =>
      old
        ? {
            ...old,
            lanes: [
              ...old.lanes,
              {
                from: "",
                to: "",
                minChargeKg: old.minChargeKg,
                incrementStepKg: old.incrementStepKg,
                base: old.base,
                perKgAfterMin: old.perKgAfterMin,
                fuelPct: old.fuelPct,
                intlSurcharge: old.intlSurcharge,
              },
            ],
          }
        : old
    );

  const removeLane = (i: number) =>
    setS((old) => (old ? { ...old, lanes: old.lanes.filter((_, idx) => idx !== i) } : old));

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const r = await fetch("/api/admin/shipping/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSaving(false);
    if (!r.ok) alert("Failed to save");
  };

  return (
    <AdminLayout>
      <div className="container py-3">
        <h3 className="mb-3">Shipping Settings</h3>
        {loading || !s ? (
          <Spinner />
        ) : (
          <>
            <Card className="mb-4">
              <Card.Body>
                <Row className="g-3">
                  <Col md={2}>
                    <Form.Label>Currency</Form.Label>
                    <Form.Control value={s.currency} onChange={(e) => up("currency", e.target.value)} />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Min kg</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={s.minChargeKg}
                      onChange={(e) => up("minChargeKg", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Step kg</Form.Label>
                    <Form.Control
                      type="number"
                      min={0.1}
                      step="0.1"
                      value={s.incrementStepKg}
                      onChange={(e) => up("incrementStepKg", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Base</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={s.base}
                      onChange={(e) => up("base", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Per kg after</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={s.perKgAfterMin}
                      onChange={(e) => up("perKgAfterMin", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Fuel %</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      step="0.01"
                      value={s.fuelPct}
                      onChange={(e) => up("fuelPct", Number(e.target.value))}
                    />
                  </Col>
                </Row>

                <Row className="g-3 mt-1">
                  <Col md={2}>
                    <Form.Label>Intl surcharge</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={s.intlSurcharge}
                      onChange={(e) => up("intlSurcharge", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Vol. divisor</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={s.divisor}
                      onChange={(e) => up("divisor", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Insurance %</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.001"
                      value={s.insurancePct}
                      onChange={(e) => up("insurancePct", Number(e.target.value))}
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Remote fee</Form.Label>
                    <Form.Control
                      type="number"
                      min={0}
                      value={s.remoteAreaFee}
                      onChange={(e) => up("remoteAreaFee", Number(e.target.value))}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Lane Overrides</h5>
              <Button size="sm" onClick={addLane}>+ Add lane</Button>
            </div>
            <Table hover responsive>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Min kg</th>
                  <th>Step kg</th>
                  <th>Base</th>
                  <th>Per kg after</th>
                  <th>Fuel %</th>
                  <th>Intl</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {s.lanes.map((ln, i) => (
                  <tr key={i}>
                    <td><Form.Control value={ln.from} onChange={(e) => upLane(i, "from", e.target.value)} /></td>
                    <td><Form.Control value={ln.to} onChange={(e) => upLane(i, "to", e.target.value)} /></td>
                    <td><Form.Control type="number" value={ln.minChargeKg} onChange={(e) => upLane(i, "minChargeKg", Number(e.target.value))} /></td>
                    <td><Form.Control type="number" step="0.1" value={ln.incrementStepKg} onChange={(e) => upLane(i, "incrementStepKg", Number(e.target.value))} /></td>
                    <td><Form.Control type="number" value={ln.base} onChange={(e) => upLane(i, "base", Number(e.target.value))} /></td>
                    <td><Form.Control type="number" value={ln.perKgAfterMin} onChange={(e) => upLane(i, "perKgAfterMin", Number(e.target.value))} /></td>
                    <td><Form.Control type="number" step="0.01" value={ln.fuelPct} onChange={(e) => upLane(i, "fuelPct", Number(e.target.value))} /></td>
                    <td><Form.Control type="number" value={ln.intlSurcharge} onChange={(e) => upLane(i, "intlSurcharge", Number(e.target.value))} /></td>
                    <td><Button variant="outline-danger" size="sm" onClick={() => removeLane(i)}>Remove</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="d-flex gap-2 justify-content-end">
              <Button variant="primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
