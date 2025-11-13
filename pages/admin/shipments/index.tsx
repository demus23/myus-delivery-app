// pages/admin/shipments/index.tsx
import * as React from "react";
import Head from "next/head";

type Rate = {
  objectId: string;
  carrier: string;
  service: string;
  amount: number;      // minor units
  currency: string;    // "AED"
  etaDays?: number;
};

export default function AdminShipments() {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    orderId: "SO-12345",
    currency: "AED",
    customerEmail: "",
    to:   { name: "Ali",        line1: "Street 1", city: "Dubai",  postalCode: "00000", country: "AE" },
    from: { name: "Warehouse", line1: "Dock 5",   city: "Dubai",  postalCode: "00000", country: "AE" },
    parcel: { length: 20, width: 15, height: 10, weight: 800 },
  });

  const [shipmentId, setShipmentId] = React.useState<string | null>(null);
  const [rates, setRates] = React.useState<Rate[]>([]);
  const [selectedRate, setSelectedRate] = React.useState<string | null>(null);
  const [labelUrl, setLabelUrl] = React.useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [carrier, setCarrier] = React.useState<string | null>(null);
  const [service, setService] = React.useState<string | null>(null);

  // Recent table
  const [rows, setRows] = React.useState<any[]>([]);

  // (Optional) CSV controls – left in place but button hidden unless you add the export API
  const [exportStatus, setExportStatus] = React.useState<string>("");
  const [exportFrom, setExportFrom] = React.useState<string>("");
  const [exportTo, setExportTo] = React.useState<string>("");

  // ---- helpers ----
  function buildExportUrl(params: { status?: string; from?: string; to?: string; limit?: number } = {}) {
    const u = new URL("/api/admin/shipments/export", window.location.origin);
    if (params.status) u.searchParams.set("status", params.status);
    if (params.from)   u.searchParams.set("from", params.from);
    if (params.to)     u.searchParams.set("to", params.to);
    if (params.limit)  u.searchParams.set("limit", String(params.limit));
    return u.toString();
  }

  async function refreshList() {
    try {
      const r = await fetch("/api/admin/shipments?limit=20", { credentials: "include" });
      const j = await r.json();
      if (j?.ok) setRows(j.data.items || j.data || []);
    } catch (e) {
      console.error(e);
    }
  }
  React.useEffect(() => { refreshList(); }, []);

  // Call real webhook via secure server proxy (no secret in browser)
  async function simulateTracking(payload: {
    trackingNumber?: string | null;
    providerShipmentId?: string | null;
    status: "in_transit" | "out_for_delivery" | "delivered" | "exception" | "return_to_sender";
  }) {
    const r = await fetch("/api/admin/shipments/simulate-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        trackingNumber: payload.trackingNumber || undefined,
        providerShipmentId: payload.providerShipmentId || undefined,
        status: payload.status,
      }),
    });
    const j = await r.json();
    if (!r.ok || !j?.ok) throw new Error(j?.forward?.error || j?.error || "Failed");
  }

  async function getRates() {
    setLoading(true);
    setMessage(null);
    setLabelUrl(null);
    setTrackingNumber(null);
    setStatus(null);
    try {
      const r = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed to get rates");
      setShipmentId(j.data.shipmentId);
      setRates(j.data.rates || []);
      setSelectedRate(null);
      setMessage(`Found ${j.data.rates.length} rate(s).`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Error";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function buy() {
    if (!shipmentId || !selectedRate) return;
    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch("/api/shipping/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, rateObjectId: selectedRate }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed to buy label");
      setLabelUrl(j.data.labelUrl);
      setTrackingNumber(j.data.trackingNumber);
      setStatus("label_purchased");
      setCarrier(j.data.carrier || null);
      setService(j.data.service || null);
      setMessage("Label purchased.");
      await refreshList();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Error";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function markDelivered() {
    if (!shipmentId && !trackingNumber) return;
    setLoading(true);
    setMessage(null);
    try {
      await simulateTracking({ trackingNumber, status: "delivered" });
      setStatus("delivered");
      setMessage("Shipment marked delivered.");
      await refreshList();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Error";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resendEmail(targetShipmentId?: string, toEmailOverride?: string) {
    const sid = targetShipmentId || shipmentId;
    if (!sid) return;
    const payload: any = { shipmentId: sid };
    if (toEmailOverride) payload.toEmail = toEmailOverride;

    setLoading(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/shipments/send-label-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed to send email");
      setMessage("Label email sent.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Error";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Admin · Shipments</title></Head>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Shipments</h1>

        {/* Create/Get rates form */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">Order ID
              <input className="mt-1 w-full border rounded px-2 py-1"
                value={form.orderId}
                onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
              />
            </label>
            <label className="text-sm">Currency
              <input className="mt-1 w-full border rounded px-2 py-1"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              />
            </label>
            <label className="text-sm">Customer Email
              <input className="mt-1 w-full border rounded px-2 py-1"
                value={form.customerEmail}
                onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                placeholder="customer@example.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">To (line1)
              <input className="mt-1 w-full border rounded px-2 py-1"
                value={form.to.line1}
                onChange={e => setForm(f => ({ ...f, to: { ...f.to, line1: e.target.value } }))}
              />
            </label>
            <label className="text-sm">From (line1)
              <input className="mt-1 w-full border rounded px-2 py-1"
                value={form.from.line1}
                onChange={e => setForm(f => ({ ...f, from: { ...f.from, line1: e.target.value } }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {(["length","width","height","weight"] as const).map(k => (
              <label key={k} className="text-sm capitalize">
                {k}
                <input type="number" className="mt-1 w-full border rounded px-2 py-1"
                  value={(form.parcel as any)[k]}
                  onChange={e =>
                    setForm(f => ({ ...f, parcel: { ...f.parcel, [k]: Number(e.target.value) || 0 } }))
                  }
                />
              </label>
            ))}
          </div>

          <button
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            onClick={getRates}
            disabled={loading}
          >
            {loading ? "Loading..." : "Get Rates"}
          </button>
        </div>

        {/* Rates */}
        {rates.length > 0 && (
          <div className="mt-6 p-4 border rounded-lg">
            <h2 className="font-medium mb-2">Rates</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {rates.map(r => (
                <label key={r.objectId} className="flex items-center gap-3 border rounded px-3 py-2">
                  <input
                    type="radio"
                    name="rate"
                    value={r.objectId}
                    checked={selectedRate === r.objectId}
                    onChange={() => setSelectedRate(r.objectId)}
                  />
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{r.carrier}</span> · {r.service} · {r.currency} {(r.amount/100).toFixed(2)}
                      {typeof r.etaDays === "number" ? <span className="text-gray-500"> · ETA {r.etaDays}d</span> : null}
                    </div>
                    <div className="text-xs text-gray-500">{r.objectId}</div>
                  </div>
                </label>
              ))}
            </div>

            <button
              className="mt-3 px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
              onClick={buy}
              disabled={!selectedRate || loading}
            >
              {loading ? "Purchasing..." : "Buy Label"}
            </button>
          </div>
        )}

        {/* Result */}
        {(shipmentId || labelUrl || trackingNumber) && (
          <div className="mt-6 p-4 border rounded-lg space-y-2">
            <div className="text-sm">Shipment ID: {shipmentId ? <code>{shipmentId}</code> : "—"}</div>
            <div className="text-sm">Tracking: {trackingNumber ? <code>{trackingNumber}</code> : "—"}</div>
            <div className="text-sm">Carrier: <span className="font-medium">{carrier || "—"}</span></div>
            <div className="text-sm">Service: <span className="font-medium">{service || "—"}</span></div>
            <div className="text-sm">Status: <span className="font-medium">{status || "—"}</span></div>
            {labelUrl && (
              <a className="inline-block mt-1 px-3 py-1 rounded bg-gray-800 text-white" href={labelUrl} target="_blank" rel="noreferrer">
                Open Label
              </a>
            )}
            <div className="flex gap-2">
              <button
                className="mt-3 px-4 py-2 rounded bg-gray-700 text-white disabled:opacity-50"
                onClick={markDelivered}
                disabled={loading || (!shipmentId && !trackingNumber) || status === "delivered"}
              >
                Mark Delivered
              </button>
              <button
                className="mt-3 px-4 py-2 rounded border disabled:opacity-50"
                onClick={() => resendEmail()}
                disabled={loading || !shipmentId}
              >
                Resend Label Email
              </button>
            </div>
          </div>
        )}

        {message && <div className="mt-4 text-sm text-blue-700">{message}</div>}

        {/* Recent Shipments */}
        <div className="mt-10 p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Recent Shipments</h2>

            {/* CSV button disabled until export API is added */}
            <div className="flex items-center gap-2">
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder='status (e.g. "delivered,label_purchased")'
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                title='e.g. "delivered,label_purchased"'
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="from (YYYY-MM-DD)"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                placeholder="to (YYYY-MM-DD)"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
              />
              {/* Uncomment when /api/admin/shipments/export exists
              <button
                className="px-3 py-1 rounded border"
                onClick={() => {
                  const url = buildExportUrl({
                    status: exportStatus || undefined,
                    from: exportFrom || undefined,
                    to: exportTo || undefined,
                    limit: 2000,
                  });
                  window.open(url, "_blank");
                }}
              >
                Download CSV
              </button> */}
              <button className="px-3 py-1 rounded border" onClick={refreshList} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Tracking</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={String(r._id)} className="border-b last:border-0">
                    <td className="py-2 pr-3">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                    <td className="py-2 pr-3">{r.orderId || "-"}</td>
                    <td className="py-2 pr-3">{r.trackingNumber ? <code>{r.trackingNumber}</code> : <span className="text-gray-500">—</span>}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center rounded px-2 py-0.5 border">{r.status || "-"}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.labelUrl ? (
                        <a className="text-blue-700 underline" href={r.labelUrl} target="_blank" rel="noreferrer">
                          open
                        </a>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <button
                          className="px-2 py-1 rounded border"
                          onClick={async () => { try {
                            await simulateTracking({ trackingNumber: r.trackingNumber, status: "in_transit" });
                            await refreshList();
                          } catch(e){ console.error(e); } }}
                        >
                          In-transit
                        </button>
                        <button
                          className="px-2 py-1 rounded border"
                          onClick={async () => { try {
                            await simulateTracking({ trackingNumber: r.trackingNumber, status: "out_for_delivery" });
                            await refreshList();
                          } catch(e){ console.error(e); } }}
                        >
                          Out for delivery
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                          disabled={r.status === "delivered"}
                          onClick={async () => { try {
                            await simulateTracking({ trackingNumber: r.trackingNumber, status: "delivered" });
                            await refreshList();
                          } catch(e){ console.error(e); } }}
                        >
                          Delivered
                        </button>
                        <button
                          className="px-2 py-1 rounded border"
                          onClick={async () => { try {
                            await simulateTracking({ trackingNumber: r.trackingNumber, status: "exception" });
                            await refreshList();
                          } catch(e){ console.error(e); } }}
                        >
                          Exception
                        </button>
                        <button
                          className="px-2 py-1 rounded border"
                          onClick={() => resendEmail(String(r._id))}
                        >
                          Resend email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={6}>
                      No shipments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
