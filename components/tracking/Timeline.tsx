import React from "react";
import StatusBadge from "./StatusBadge";

export type TrackingEvent = {
  status: string;
  message?: string;
  location?: string;
  at?: string; // ISO date
};

export default function Timeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: "12px 0 0 0" }}>
      {events.map((e, i) => (
        <li key={i} style={{
          display: "flex", gap: 14, padding: "12px 8px 12px 0",
          borderBottom: "1px dashed #e7eefa"
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: 999, background: "#21d2b8",
            marginTop: 10, boxShadow: "0 0 0 3px #c8f6ee"
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <StatusBadge status={e.status} />
              <div style={{ fontWeight: 800, color: "#1b2a46" }}>
                {e.status.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase())}
              </div>
              <div style={{ color: "#7083ad" }}>
                {e.at ? new Date(e.at).toLocaleString() : "—"}
              </div>
            </div>
            {e.location && <div style={{ color: "#5c6f98", marginTop: 4 }}>Location: {e.location}</div>}
            {e.message && <div style={{ color: "#2a3958", marginTop: 6 }}>{e.message}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
