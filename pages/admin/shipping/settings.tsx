import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, Table, Form, Button, Spinner, Alert, Row, Col, Badge } from "react-bootstrap";

type SpeedCfg = { basePerKgAED: number; minChargeAED: number };
type CarrierRow = {
  name: "DHL" | "Aramex" | "UPS" | string;
  enabled: boolean;
  standard: SpeedCfg;
  express: SpeedCfg;
  fuelPercent: number;             // 0..100
  remoteSurchargeAED: number;      // flat add-on
};

type LoadResp = {
  ok: boolean;
  carriers: CarrierRow[];
  updatedAt?: string;
};

export default function AdminShippingSettingsPage() {
  const [rows, setRows] = useState<CarrierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await fetch("/api/admin/shipping-settings");
      const d: LoadResp = await r.json().catch(() => ({ ok: false, carriers: [] } as any));
      if (!r.ok || !d?.ok) throw new Error((d as any)?.error || `HTTP ${r.status}`);
      setRows(d.carriers || []);
      if (d.updatedAt) setInfo(`Last updated: ${new Date(d.updatedAt).toLocaleString()}`);
      } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load settings.";
  setErr(msg);   
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setVal(i: number, path: (r: CarrierRow) => any, value: any) {
    setRows(prev => {
      const next = [...prev];
      // cheap deep set: we know structure
      const row = { ...next[i] };
      next[i] = row;
      // figure target by path keys
      // we’ll branch manually for clarity & types
      if (path(row) === row.enabled) row.enabled = Boolean(value);
      else if (path(row) === row.fuelPercent) row.fuelPercent = Number(value) || 0;
      else if (path(row) === row.remoteSurchargeAED) row.remoteSurchargeAED = Number(value) || 0;
      else if (path(row) === row.standard.basePerKgAED) row.standard = { ...row.standard, basePerKgAED: Number(value) || 0 };
      else if (path(row) === row.standard.minChargeAED) row.standard = { ...row.standard, minChargeAED: Number(value) || 0 };
      else if (path(row) === row.express.basePerKgAED) row.express = { ...row.express, basePerKgAED: Number(value) || 0 };
      else if (path(row) === row.express.minChargeAED) row.express = { ...row.express, minChargeAED: Number(value) || 0 };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setInfo(null);
    try {
      const r = await fetch("/api/admin/shipping-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carriers: rows }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || `HTTP ${r.status}`);
      setInfo("Saved.");
      } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Save failed.";
  setErr(msg); 
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Shipping Settings</h4>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={load} disabled={loading || saving}>
            {loading ? <Spinner size="sm" /> : "Reload"}
          </Button>
          <Button variant="primary" onClick={save} disabled={saving || loading}>
            {saving ? <Spinner size="sm" /> : "Save"}
          </Button>
        </div>
      </div>

      {err && <Alert variant="danger">{err}</Alert>}
      {info && <Alert variant="info">{info}</Alert>}

      <Card className="shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="d-flex justify-content-center py-4"><Spinner animation="border" /></div>
          ) : rows.length === 0 ? (
            <div className="text-muted">No carriers configured.</div>
          ) : (
            <Table hover responsive size="sm" className="align-middle">
              <thead>
                <tr>
                  <th style={{minWidth:110}}>Carrier</th>
                  <th>Enabled</th>
                  <th className="text-center">Standard Base/kg (AED)</th>
                  <th className="text-center">Standard Min (AED)</th>
                  <th className="text-center">Express Base/kg (AED)</th>
                  <th className="text-center">Express Min (AED)</th>
                  <th className="text-center">Fuel %</th>
                  <th className="text-center">Remote (AED)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.name}>
                    <td className="fw-semibold">
                      {r.name} {r.enabled ? <Badge bg="success" className="ms-1">On</Badge> : <Badge bg="secondary" className="ms-1">Off</Badge>}
                    </td>
                    <td>
                      <Form.Check
                        type="switch"
                        checked={r.enabled}
                        onChange={(e) => setVal(i, x => x.enabled, e.currentTarget.checked)}
                        aria-label={`Enable ${r.name}`}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        inputMode="decimal"
                        value={r.standard.basePerKgAED}
                        onChange={(e) => setVal(i, x => x.standard.basePerKgAED, e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        inputMode="decimal"
                        value={r.standard.minChargeAED}
                        onChange={(e) => setVal(i, x => x.standard.minChargeAED, e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        inputMode="decimal"
                        value={r.express.basePerKgAED}
                        onChange={(e) => setVal(i, x => x.express.basePerKgAED, e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm"
                        inputMode="decimal"
                        value={r.express.minChargeAED}
                        onChange={(e) => setVal(i, x => x.express.minChargeAED, e.target.value)}
                      />
                    </td>
                    <td>
                      <InputWithSuffix
                        value={r.fuelPercent}
                        suffix="%"
                        onChange={(v) => setVal(i, x => x.fuelPercent, v)}
                      />
                    </td>
                    <td>
                      <InputWithSuffix
                        value={r.remoteSurchargeAED}
                        suffix="AED"
                        onChange={(v) => setVal(i, x => x.remoteSurchargeAED, v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="small text-muted">
            Base/min apply before surcharges. Fuel is a % applied to the base; remote is a flat add-on.
          </div>
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}

function InputWithSuffix({
  value,
  suffix,
  onChange,
}: {
  value: number | string;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="d-flex align-items-center">
      <Form.Control
        size="sm"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <span className="ms-1 text-muted small">{suffix}</span>
    </div>
  );
}
