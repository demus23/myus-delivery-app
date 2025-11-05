import { useState } from "react";

type TrackEvent = {
  _id: string;
  status: string;
  location?: string;
  note?: string;
  createdAt: string;
};

export default function TrackWidget() {
  const [trackingNo, setTrackingNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<TrackEvent | null>(null);
  const [error, setError] = useState("");

  async function doTrack() {
    setError("");
    setLast(null);
    if (!trackingNo.trim()) {
      setError("Enter a tracking number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tracking/events?trackingNo=${encodeURIComponent(trackingNo)}&limit=1`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const events: TrackEvent[] = data?.events || [];
      setLast(events[0] || null);
      if (!events.length) setError("No updates yet for this tracking number.");
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Failed to fetch tracking info";
  setError(msg); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex align-items-center gap-3 p-3 border rounded">
      <div className="fw-semibold">Track Package:</div>
      <input
        className="form-control"
        style={{ maxWidth: 220 }}
        placeholder="e.g., AB23456"
        value={trackingNo}
        onChange={(e) => setTrackingNo(e.target.value)}
      />
      <button className="btn btn-secondary" onClick={doTrack} disabled={loading}>
        {loading ? "..." : "Track"}
      </button>

      {/* Result block */}
      {last && (
        <div className="ms-4">
          <div><span className="fw-semibold">Status:</span> {last.status?.replaceAll("_", " ") || "—"}</div>
          <div><span className="fw-semibold">Location:</span> {last.location || "—"}</div>
        </div>
      )}

      {error && <div className="ms-4 text-danger small">{error}</div>}
    </div>
  );
}
