import React, { useEffect, useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import Timeline, { TrackingEvent } from "./Timeline";

type Props = {
  initialTrackingNo?: string;
  compact?: boolean;      // smaller header for admin sidebar cards
  enablePolling?: boolean; // auto-refresh
  pollMs?: number;         // default 30s
};

async function fetchEvents(trackingNo: string): Promise<TrackingEvent[]> {
  const res = await fetch(`/api/tracking/events?trackingNo=${encodeURIComponent(trackingNo)}&limit=50`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const list: TrackingEvent[] = (data?.events || data || []).map((e: any) => ({
    status: e.status ?? e.event ?? "update",
    message: e.message ?? e.desc ?? e.description ?? "",
    location: e.location ?? e.where ?? "",
    at: e.at ?? e.createdAt ?? e.time ?? e.ts ?? null,
  }));
  list.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  return list;
}

export default function TrackingSearchCard({
  initialTrackingNo = "",
  compact,
  enablePolling = false,
  pollMs = 30000,
}: Props) {
  const [trackingNo, setTrackingNo] = useState(initialTrackingNo);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TrackingEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = useMemo(() => (events?.[0] ? events[0] : null), [events]);

  async function run() {
    if (!trackingNo.trim()) return;
    setLoading(true); setError(null);
    try {
      const list = await fetchEvents(trackingNo.trim());
      setEvents(list);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to load tracking";
  setError(msg);    
    } finally {
      setLoading(false);
    }
  }

  // Enter to search
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") run();
  }

  // Optional polling
  useEffect(() => {
    if (!enablePolling || !events || !trackingNo) return;
    const id = setInterval(run, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enablePolling, pollMs, trackingNo, !!events]);

  return (
    <section style={{
      background: "#fff", border: "1px solid #e8eef7", borderRadius: 14,
      boxShadow: "0 8px 18px rgba(26,42,68,0.08)", padding: 16
    }}>
      {/* Search Row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {!compact && <h3 style={{ margin: 0, fontWeight: 900, color: "#1b2a46" }}>Quick Track</h3>}
        <div style={{ flex: "1 1 260px", display: "flex", gap: 8 }}>
          <input
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            onKeyDown={onKey}
            placeholder="Enter tracking #"
            style={{
              flex: 1, minWidth: 220, height: 42, borderRadius: 10, border: "1px solid #dbe4f2",
              padding: "0 12px", fontSize: 15, outline: "none"
            }}
          />
          <button onClick={run} disabled={loading} style={btnPrimary}>
            {loading ? "Searching…" : "Track"}
          </button>
        </div>

        {/* Copy/share mini actions */}
        {trackingNo && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(trackingNo)}
              style={btnGhost}
              title="Copy tracking number"
            >
              Copy
            </button>
            <a
              href={`/track?no=${encodeURIComponent(trackingNo)}`}
              style={{ ...btnGhost, textDecoration: "none" }}
              title="Open public tracker"
            >
              Open
            </a>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: "#fff4f4", border: "1px solid #ffd9d9", color: "#a33"
        }}>
          {error}
        </div>
      )}

      {/* Summary */}
      {events && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #e8eef7",
          background: "#fbfdff"
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={latest?.status} />
            <div style={{ fontWeight: 900, color: "#1b2a46" }}>
              {latest?.status?.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase()) || "Update"}
            </div>
            <div style={{ color: "#6b7ba4" }}>
              {latest?.at ? new Date(latest.at).toLocaleString() : "—"}
            </div>
          </div>
          {latest?.location && <div style={{ color: "#5c6f98", marginTop: 6 }}>Location: {latest.location}</div>}
          {latest?.message && <div style={{ color: "#2a3958", marginTop: 8 }}>{latest.message}</div>}
        </div>
      )}

      {/* Timeline */}
      {events && <div style={{ marginTop: 12 }}><Timeline events={events} /></div>}

      {/* Empty state */}
      {!events && !error && !loading && (
        <div style={{ marginTop: 12, color: "#5a6d92" }}>Enter a tracking number to see updates.</div>
      )}
    </section>
  );
}

const btnPrimary: React.CSSProperties = {
  border: "none", borderRadius: 10, background: "#2179e8", color: "#fff",
  fontWeight: 800, height: 42, padding: "0 14px", cursor: "pointer",
  boxShadow: "0 10px 24px rgba(33,121,232,0.22)"
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #dbe4f2", background: "#fff", color: "#2a3a5a",
  fontWeight: 800, height: 40, padding: "0 12px", borderRadius: 10, cursor: "pointer"
};
