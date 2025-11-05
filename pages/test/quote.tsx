import { useState } from 'react';
import { useRouter } from 'next/router';


type ErrorLike = { message?: string };

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as ErrorLike).message;
    if (typeof m === "string" && m) return m;
  }
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Unknown error"; }
}

export default function QuoteTestPage() {
  const [from, setFrom] = useState({ country: 'UAE', city: 'Dubai', postcode: '' });
  const [to, setTo] = useState({ country: 'GB', city: 'London', postcode: 'SW1A1AA' });
  const [weightKg, setWeightKg] = useState<number>(2.5);
  const [dimsCm, setDimsCm] = useState({ l: 30, w: 25, h: 15 });
  const [express, setExpress] = useState(false);
  const [remoteOverride, setRemoteOverride] = useState(false);

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [cheapestIndex, setCheapestIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getQuotes = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, weightKg, dimsCm, express, remoteOverride }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to quote');
      setQuote({ id: data.quoteId, remoteDetected: data.remoteDetected });
      setOptions(data.options || []);
      setCheapestIndex(data.cheapestIndex ?? null);
      setSelectedIndex(data.cheapestIndex ?? null);
  } catch (err: unknown) {
  setError(getErrorMessage(err) || "Error");
} finally {
  setLoading(false);
}

  };

  const choose = async () => {
    if (!quote?.id || selectedIndex == null) return;
    await fetch(`/api/shipping/quote/${quote.id}/choose`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chosenIndex: selectedIndex }),
    });
  };

  const proceed = async () => {
    if (!quote?.id || selectedIndex == null) return;
    await choose();
    const res = await fetch('/api/shipping/proceed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.id, displayCurrency: 'AED' }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Shipment created: ${data.shipmentId}`);
      // if you have a shipments page, go there:
      // router.push(`/shipments/${data.shipmentId}?prefill=1`);
    } else {
      alert(data.error || 'Failed to create shipment');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1>Quote Test</h1>
      <p>Make sure you are logged in. If you get 401, sign in first.</p>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>Error: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <h3>From</h3>
          <input placeholder="Country" value={from.country} onChange={e=>setFrom({...from, country:e.target.value})} />
          <input placeholder="City" value={from.city} onChange={e=>setFrom({...from, city:e.target.value})} />
          <input placeholder="Postcode" value={from.postcode} onChange={e=>setFrom({...from, postcode:e.target.value})} />
        </div>
        <div>
          <h3>To</h3>
          <input placeholder="Country" value={to.country} onChange={e=>setTo({...to, country:e.target.value})} />
          <input placeholder="City" value={to.city} onChange={e=>setTo({...to, city:e.target.value})} />
          <input placeholder="Postcode" value={to.postcode} onChange={e=>setTo({...to, postcode:e.target.value})} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
        <div>
          <label>Weight (kg)</label>
          <input type="number" value={weightKg} onChange={e=>setWeightKg(Number(e.target.value))} />
        </div>
        <div>
          <label>L (cm)</label>
          <input type="number" value={dimsCm.l} onChange={e=>setDimsCm({...dimsCm, l:Number(e.target.value)})} />
        </div>
        <div>
          <label>W (cm)</label>
          <input type="number" value={dimsCm.w} onChange={e=>setDimsCm({...dimsCm, w:Number(e.target.value)})} />
        </div>
        <div>
          <label>H (cm)</label>
          <input type="number" value={dimsCm.h} onChange={e=>setDimsCm({...dimsCm, h:Number(e.target.value)})} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <label><input type="checkbox" checked={express} onChange={e=>setExpress(e.target.checked)} /> Express</label>
        <label><input type="checkbox" checked={remoteOverride} onChange={e=>setRemoteOverride(e.target.checked)} /> Remote area (override)</label>
        {quote?.remoteDetected ? <span style={{ color: '#b45309' }}>Remote area detected</span> : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={getQuotes} disabled={loading}>{loading ? 'Calculating…' : 'Get Quotes'}</button>
      </div>

      {options.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>Options</h3>
          <table cellPadding={6} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th align="left">Carrier</th>
                <th align="left">Service</th>
                <th align="left">Transit</th>
                <th align="right">Price (AED)</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o, i) => (
                <tr key={i} style={{ borderTop: '1px solid #e5e7eb', background: i===cheapestIndex ? '#ecfdf5' : undefined }}>
                  <td>{o.carrier}</td>
                  <td className="capitalize">{o.service}</td>
                  <td>{o.transitDays} days</td>
                  <td align="right">{o.totalPriceAED.toLocaleString()}</td>
                  <td align="center">
                    <input type="radio" name="opt" checked={i===selectedIndex} onChange={()=>setSelectedIndex(i)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={proceed} disabled={!quote?.id || selectedIndex==null}>Proceed to shipment</button>
          </div>
        </>
      )}

      <style jsx>{`
        input { width: 100%; padding: 6px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 4px; }
        label { display: block; font-size: 12px; color: #6b7280; }
      `}</style>
    </div>
  );
}
