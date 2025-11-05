import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ShipmentDetailPage() {
  const router = useRouter();
  const { id, prefill } = router.query as { id?: string; prefill?: string };
  const [s, setS] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'AED'|'USD'|'GBP'>('AED');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/shipments/${id}`);
      const d = await r.json();
      setS(d);
      setCurrency(d.displayCurrency || 'AED');
      setLoading(false);
    })();
  }, [id]);

  const totalDisplay = useMemo(() => {
    if (!s) return 0;
    const base = Number(s.rateAED || 0);
    const converted = currency === 'AED' ? base : base * Number(s.fxRate || 1);
    return Math.round(converted * 100) / 100;
  }, [s, currency]);

  const applyCurrency = async () => {
    if (!id) return;
    setUpdating(true);
    const r = await fetch(`/api/shipments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayCurrency: currency }),
    });
    const d = await r.json();
    setS(d);
    setUpdating(false);
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!s?._id) return <div className="p-6">Not found.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Shipment</h1>
        <Link className="underline" href="/shipments">Back to list</Link>
      </div>

      {prefill === '1' && (
        <div className="mb-3 rounded-lg bg-green-50 text-green-800 px-3 py-2">
          Prefilled from chosen quote.
        </div>
      )}

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Carrier</div>
            <div className="font-medium">{s.carrier}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Service</div>
            <div className="font-medium capitalize">{s.service}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">From</div>
            <div>{s.route?.from?.city}, {s.route?.from?.country} {s.route?.from?.postcode || ''}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">To</div>
            <div>{s.route?.to?.city}, {s.route?.to?.country} {s.route?.to?.postcode || ''}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Weight</div>
            <div>{s.weightKg} kg</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Dims (cm)</div>
            <div>{s.dimsCm?.l} × {s.dimsCm?.w} × {s.dimsCm?.h}</div>
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="text-xs text-gray-500">Pricing</div>
          <div className="flex items-center gap-3">
            <div>Base (AED): <b>{Number(s.rateAED || 0).toLocaleString()}</b></div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600">Display currency</span>
              <select className="border rounded px-2 py-1" value={currency} onChange={e=>setCurrency(e.target.value as any)}>
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
              <button onClick={applyCurrency} disabled={updating} className="rounded bg-black text-white px-3 py-1">
                {updating ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </div>
          <div className="mt-1 text-lg">
            Total: <b>{currency} {totalDisplay.toLocaleString()}</b>
          </div>
          <div className="text-xs text-gray-500">
            (FX rate stored on creation: {s.fxRate} for AED → {s.displayCurrency})
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="text-xs text-gray-500">Status</div>
          <div className="font-medium">{s.status}</div>
        </div>

        {/* Placeholder: where you'd add label creation / pickup scheduling, etc. */}
        <div className="pt-3 border-t">
          <button className="rounded bg-indigo-600 text-white px-4 py-2">Create label (stub)</button>
        </div>
      </div>
    </div>
  );
}
