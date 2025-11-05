// pages/track/[trackingNo].tsx
import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  ListGroup,
  Spinner,
} from "react-bootstrap";

type TimelineItem = {
  time: string;                // ISO string
  status?: string;
  location?: string | null;
  message?: string | null;
  trackingNo?: string;
  createdAt?: string;
};

type PackageSummary = {
  tracking: string;
  courier: string | null;
  status: string;
  location: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type TrackApiOk = {
  ok: true;
  package: PackageSummary;
  events: TimelineItem[];
};

type TrackApiErr = { ok: false; error: string };

// Legacy shape fallback (older API)
type LegacyTrackResponse = {
  tracking: string;
  status: string;
  location?: string;
  lastUpdate?: string;
};

const STATUS_BG: Record<string, string> = {
  Delivered: "success",
  "In Transit": "info",
  Pending: "warning",
  Problem: "danger",
};

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function TrackPage() {
  const router = useRouter();
  const trackingNo = Array.isArray(router.query.trackingNo)
    ? router.query.trackingNo[0]
    : router.query.trackingNo;

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const [pkg, setPkg] = useState<PackageSummary | null>(null);
  const [events, setEvents] = useState<TimelineItem[]>([]);

  async function load() {
    if (!trackingNo) return;
    setLoading(true);
    setErr("");
    setPkg(null);
    setEvents([]);

    try {
      const r = await fetch(`/api/track?trackingNo=${encodeURIComponent(trackingNo)}`);
      const text = await r.text();

      // Try new shape first
      try {
        const json = JSON.parse(text) as TrackApiOk | TrackApiErr;
        if ("ok" in json) {
          if (!json.ok) {
            setErr(json.error || "Not found");
          } else {
            setPkg(json.package);
            setEvents(Array.isArray(json.events) ? json.events : []);
          }
          setLoading(false);
          return;
        }
      } catch {
        // fall through and try legacy parsing
      }

      // Legacy support
      try {
        const legacy = JSON.parse(text) as LegacyTrackResponse;
        if (legacy && legacy.tracking) {
          setPkg({
            tracking: legacy.tracking,
            courier: null,
            status: legacy.status || "Pending",
            location: legacy.location ?? null,
            createdAt: legacy.lastUpdate ?? null,
            updatedAt: legacy.lastUpdate ?? null,
          });
          setEvents([]); // legacy endpoint didn’t return timeline
        } else {
          setErr("Not found");
        }
      } catch {
        setErr("Failed to parse response");
      }
   } catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  setErr(msg || "Failed to load");
} finally {
  setLoading(false);
}

  }

  useEffect(() => {
    if (trackingNo) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNo]);

  const statusBadge = useMemo(() => {
    const label = pkg?.status || "Pending";
    const bg = STATUS_BG[label] ?? "secondary";
    return <Badge bg={bg}>{label}</Badge>;
  }, [pkg?.status]);

  const sortedEvents = useMemo(() => {
    // Ensure stable, newest first
    const copy = [...events];
    copy.sort((a: TimelineItem, b: TimelineItem) => {
      const ta = new Date(a.time ?? a.createdAt ?? 0).getTime();
      const tb = new Date(b.time ?? b.createdAt ?? 0).getTime();
      return tb - ta;
    });
    return copy;
  }, [events]);

  return (
    <>
      <Head>
        <title>Track {trackingNo ? `#${trackingNo}` : ""} | Tracking</title>
      </Head>

      <Container className="py-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="mb-0">Tracking</h3>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button variant="outline-primary" onClick={load} disabled={loading}>
              {loading ? <Spinner size="sm" /> : "Reload"}
            </Button>
          </div>
        </div>

        {!trackingNo && (
          <Alert variant="warning">No tracking number provided in the URL.</Alert>
        )}

        {err && <Alert variant="danger" className="mb-3">{err}</Alert>}

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: 240 }}>
            <Spinner animation="border" />
          </div>
        ) : pkg ? (
          <>
            {/* Summary */}
            <Card className="shadow-sm mb-3">
              <Card.Header style={{ background: "white" }}>
                <strong>Package Summary</strong>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between">
                  <div className="mb-2">
                    <div className="text-muted small">Tracking #</div>
                    <div className="fs-5 fw-bold">{pkg.tracking}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-muted small">Status</div>
                    <div className="fs-6">{statusBadge}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-muted small">Courier</div>
                    <div className="fs-6">{pkg.courier || "—"}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-muted small">Location</div>
                    <div className="fs-6">{pkg.location || "—"}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-muted small">Last Update</div>
                    <div className="fs-6">
                      {formatWhen(pkg.updatedAt || pkg.createdAt)}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Timeline */}
            <Card className="shadow-sm">
              <Card.Header style={{ background: "white" }}>
                <strong>Tracking Timeline</strong>
              </Card.Header>
              <ListGroup variant="flush">
                {sortedEvents.length === 0 ? (
                  <ListGroup.Item className="text-muted">
                    No events yet.
                  </ListGroup.Item>
                ) : (
                  sortedEvents.map((e, idx) => (
                    <ListGroup.Item key={`${e.time}-${idx}`}>
                      <div className="d-flex flex-wrap justify-content-between">
                        <div className="me-3">
                          <div className="fw-semibold">
                            {e.status || "Update"}
                            {e.location ? ` — ${e.location}` : ""}
                          </div>
                          {e.message && (
                            <div className="text-muted">{e.message}</div>
                          )}
                        </div>
                        <div className="text-muted small">
                          {formatWhen(e.time || e.createdAt)}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card>
          </>
        ) : (
          !err && (
            <Alert variant="warning">Package not found.</Alert>
          )
        )}
      </Container>
    </>
  );
}
