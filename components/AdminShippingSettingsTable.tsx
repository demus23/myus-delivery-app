import { useEffect, useState } from 'react';

type Row = {
  carrier: 'DHL' | 'Aramex' | 'UPS';
  enabled: boolean;
  volumetricDivisor: number;
  baseRatePerKgAED: { standard: number; express: number };
  minChargeAED: { standard: number; express: number };
  fuelSurchargePct: number;
  markupPct: number;
  remoteAreaSurchargeAED: number;
  remoteAreaPostcodePrefixes: string; // CSV in UI
};

export default function AdminShippingSettingsTable({ embedded = false }: { embedded?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const r = await fetch('/api/admin/shipping-settings');
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to load settings');
      const mapped: Row[] = (data as any[]).map((d) => ({
        carrier: d.carrier,
        enabled: !!d.enabled,
        volumetricDivisor: Number(d.volumetricDivisor) || 5000,
        baseRatePerKgAED: d.baseRatePerKgAED || { standard: 20, express: 30 },
        minChargeAED: d.minChargeAED || { standard: 60, express: 90 },
        fuelSurchargePct: Number(d.fuelSurchargePct) || 0,
        markupPct: Number(d.markupPct) || 0,
        remoteAreaSurchargeAED: Number(d.remoteAreaSurchargeAED) || 0,
        remoteAreaPostcodePrefixes: (d.remoteAreaPostcodePrefixes || []).join(','),
      }));
      setRows(mapped);
    }catch (e: unknown) {
       const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
     "Error loading settings"
     setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (i: number, key: keyof Row, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      (next[i] as any)[key] = value;
      return next;
    });
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = rows.map((r) => ({
        ...r,
        remoteAreaPostcodePrefixes: r.remoteAreaPostcodePrefixes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }));
      const res = await fetch('/api/admin/shipping-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
   } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Save failed";
  setError(msg);
} finally {
  setSaving(false);
}

  };

  return (
    <div className={embedded ? '' : 'p-6 max-w-6xl mx-auto'}>
      {!embedded && <h1 className="text-2xl font-semibold mb-4">Shipping Settings</h1>}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Carrier','Enabled','Divisor','Base/kg (Std, Exp)','Min (Std, Exp)','Fuel%','Markup%','Remote Surcharge','Remote Prefixes'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={9}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={9}>No carriers found.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.carrier} className="border-t last:border-b-0">
                <td className="px-3 py-2 font-medium">{r.carrier}</td>
                <td className="px-3 py-2"><input type="checkbox" checked={r.enabled} onChange={(e) => update(i, 'enabled', e.target.checked)} /></td>
                <td className="px-3 py-2"><input className="w-24 rounded border px-2 py-1" type="number" value={r.volumetricDivisor} onChange={(e) => update(i, 'volumetricDivisor', Number(e.target.value))} /></td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <input className="w-24 rounded border px-2 py-1" type="number" value={r.baseRatePerKgAED.standard} onChange={(e) => update(i, 'baseRatePerKgAED', { ...r.baseRatePerKgAED, standard: Number(e.target.value) })} />
                    <input className="w-24 rounded border px-2 py-1" type="number" value={r.baseRatePerKgAED.express} onChange={(e) => update(i, 'baseRatePerKgAED', { ...r.baseRatePerKgAED, express: Number(e.target.value) })} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <input className="w-24 rounded border px-2 py-1" type="number" value={r.minChargeAED.standard} onChange={(e) => update(i, 'minChargeAED', { ...r.minChargeAED, standard: Number(e.target.value) })} />
                    <input className="w-24 rounded border px-2 py-1" type="number" value={r.minChargeAED.express} onChange={(e) => update(i, 'minChargeAED', { ...r.minChargeAED, express: Number(e.target.value) })} />
                  </div>
                </td>
                <td className="px-3 py-2"><input className="w-20 rounded border px-2 py-1" type="number" value={r.fuelSurchargePct} onChange={(e) => update(i, 'fuelSurchargePct', Number(e.target.value))} /></td>
                <td className="px-3 py-2"><input className="w-20 rounded border px-2 py-1" type="number" value={r.markupPct} onChange={(e) => update(i, 'markupPct', Number(e.target.value))} /></td>
                <td className="px-3 py-2"><input className="w-24 rounded border px-2 py-1" type="number" value={r.remoteAreaSurchargeAED} onChange={(e) => update(i, 'remoteAreaSurchargeAED', Number(e.target.value))} /></td>
                <td className="px-3 py-2"><input className="w-64 rounded border px-2 py-1" type="text" value={r.remoteAreaPostcodePrefixes} onChange={(e) => update(i, 'remoteAreaPostcodePrefixes', e.target.value)} placeholder="AB3, BT7, GY1" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={save} disabled={saving || loading} className="rounded-xl bg-black px-4 py-2 text-white shadow disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={load} className="rounded-xl border px-4 py-2">Reload</button>
      </div>
    </div>
  );
}
