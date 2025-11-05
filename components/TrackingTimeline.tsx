import React from "react";
import { Badge } from "react-bootstrap";

export type TrackingEvent = {
  _id?: string;
  packageId?: string;
  trackingNo: string;
  status: string;
  location?: string;
  note?: string;
  createdAt: string | Date;
  actorName?: string;
};

function fmtStatus(raw: string) {
  const s = (raw || "").toString();
  return s
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

function badgeFor(status: string): "success" | "warning" | "danger" | "info" | "secondary" {
  const s = (status || "").toLowerCase();
  if (s.includes("deliver")) return "success";
  if (s.includes("pend")) return "warning";
  if (s.includes("problem") || s.includes("cancel")) return "danger";
  if (s.includes("transit") || s.includes("ship")) return "info";
  return "secondary";
}

type Props = {
  events: TrackingEvent[];
  compact?: boolean;
};

export default function TrackingTimeline({ events, compact = false }: Props) {
  const sorted = [...(events || [])].sort((a, b) => {
    const ta = new Date(a.createdAt as any).getTime();
    const tb = new Date(b.createdAt as any).getTime();
    return tb - ta; // newest first
  });

  if (!sorted.length) {
    return <div className="text-muted">No tracking events yet.</div>;
  }

  return (
    <ul className="list-group list-group-flush">
      {sorted.map((ev) => (
        <li key={ev._id || String(ev.createdAt)} className="list-group-item">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <Badge bg={badgeFor(ev.status)} className="me-2">
                {fmtStatus(ev.status)}
              </Badge>
              {ev.location && <span className="text-muted"> @ {ev.location}</span>}
              {ev.actorName && <span className="text-muted"> · by {ev.actorName}</span>}
              {ev.note && (
                <div className="mt-1">
                  <small className="text-body">{ev.note}</small>
                </div>
              )}
            </div>
            <small className="text-muted">
              {new Date(ev.createdAt).toLocaleString()}
            </small>
          </div>
        </li>
      ))}
    </ul>
  );
}
