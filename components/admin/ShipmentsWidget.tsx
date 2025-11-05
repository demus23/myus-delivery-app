// components/admin/ShipmentsWidget.tsx
import * as React from "react";
import Link from "next/link";

type SummaryResponse = {
  ok: boolean;
  data?: {
    totals: {
      total: number;
      delivered: number;
      in_transit: number;
      out_for_delivery: number;
      label_purchased: number;
      pending: number;
      exception: number;
      canceled: number;
      deliveredToday: number;
      [k: string]: number;
    };
    recent: Array<{
      id: string;
      trackingNumber?: string;
      status?: string;
      carrier?: string;
      service?: string;
      createdAt?: string;
    }>;
  };
};

export default function ShipmentsWidget() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<SummaryResponse["data"] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    fetch("/api/admin/shipments/summary")
      .then(r => r.json())
      .then((j: SummaryResponse) => {
        if (!mounted) return;
        if (!j.ok) throw new Error("Failed to load");
        setData(j.data!);
      })
      .catch(e => mounted && setError(e.message || "Failed"))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="rounded-xl border p-4">Loading shipments…</div>;
  if (error || !data) return <div className="rounded-xl border p-4 text-red-600">Failed to load shipments.</div>;

  const t = data.totals;

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Shipments</h3>
        <Link href="/admin/shipments" className="text-sm text-blue-600 hover:underline">View all</Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total" value={t.total} />
        <Kpi label="In transit" value={t.in_transit} />
        <Kpi label="Out for delivery" value={t.out_for_delivery} />
        <Kpi label="Delivered (today)" value={t.deliveredToday} />
      </div>

      {/* Recent table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2 pr-4 text-left">Created</th>
              <th className="py-2 pr-4 text-left">Tracking</th>
              <th className="py-2 pr-4 text-left">Carrier / Service</th>
              <th className="py-2 pr-4 text-left">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.recent.map(r => (
              <tr key={r.id}>
                <td className="py-2 pr-4">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                <td className="py-2 pr-4 font-mono">{r.trackingNumber || "—"}</td>
                <td className="py-2 pr-4">{r.carrier || "—"} {r.service ? `· ${r.service}` : ""}</td>
                <td className="py-2 pr-4"><StatusPill status={r.status} /></td>
                <td className="py-2 pr-0">
                  <Link
                    href={`/admin/shipments?tn=${encodeURIComponent(r.trackingNumber || "")}`}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {data.recent.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-gray-500">No shipments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const color =
    s === "delivered" ? "bg-green-100 text-green-700" :
    s === "in_transit" ? "bg-blue-100 text-blue-700" :
    s === "out_for_delivery" ? "bg-indigo-100 text-indigo-700" :
    s === "label_purchased" ? "bg-yellow-100 text-yellow-700" :
    s === "exception" ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-700";
  return <span className={`px-2 py-1 rounded-full text-xs ${color}`}>{status || "unknown"}</span>;
}
