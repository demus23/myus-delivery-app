import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ShipmentsListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch('/api/shipments');
      const d = await r.json();
      setRows(Array.isArray(d) ? d : []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Shipments</h1>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <div>No shipments yet.</div> : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Created', 'Carrier', 'Service', 'Status', 'Amount (AED)', 'Amount (Display)', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any) => (
                <tr key={s._id} className="border-t">
                  <td className="px-3 py-2">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{s.carrier}</td>
                  <td className="px-3 py-2 capitalize">{s.service}</td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2">AED {Number(s.rateAED || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {s.displayCurrency} {(Number(s.rateAED || 0) * Number(s.fxRate || 1)).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/shipments/${s._id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
