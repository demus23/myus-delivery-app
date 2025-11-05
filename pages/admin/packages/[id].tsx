// pages/admin/packages/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

type Package = {
  _id: string;
  title?: string;
  suiteId?: string;
  courier?: string;
  tracking?: string; // used as trackingNo
  value?: string;
  status?: string;
  createdAt?: string;

  // NEW (optional snapshot on the package; safe even if your API ignores these)
  location?: string;
  note?: string;
};

export default function EditPackagePage() {
  const { query, push } = useRouter();
  const { data: session, status } = useSession();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [form, setForm] = useState<Partial<Package>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [postToTimeline, setPostToTimeline] = useState(true); // NEW

  useEffect(() => {
    if (status === "loading" || !query.id) return;
    if (!session || (session as any).user?.role !== "admin") {
      push("/login");
      return;
    }

    fetch(`/api/admin/packages/${query.id}`)
      .then((res) => res.json())
      .then((data) => {
        setPkg(data);
        setForm({
          ...data,
          location: (data as any).location ?? "", // tolerate if API doesn't return
          note: (data as any).note ?? "",
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load package.");
        setLoading(false);
      });
  }, [status, session, query, push]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setEditing(true);
  setError("");

  try {
    // 1) Update the package (your existing endpoint)
    const res = await fetch(`/api/admin/packages/${query.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error("Failed to update package.");

    // 2) ALSO create a tracking event so snapshots update
    const trackingNo = (form.tracking ?? pkg?.tracking ?? "").trim();
    const status = (form.status ?? pkg?.status ?? "Pending") as string;
    const location = (form as any).location ?? ""; // add <input name="location" />
    const note = (form as any).note ?? "";         // add <textarea name="note" />

    if (trackingNo) {
      await fetch(`/api/tracking/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg!._id,
          trackingNo,
          status,
          location,
          note,
        }),
      }).catch(() => {});
    }

    push("/admin/packages");
  } catch (err: any) {
    setError(err.message || "Error occurred.");
  } finally {
    setEditing(false);
  }
};


  if (loading) {
    return (
      <AdminLayout>
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="spinner-border text-primary mt-5" />
        </div>
      </AdminLayout>
    );
  }

  if (!pkg) {
    return (
      <AdminLayout>
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="alert alert-danger mt-5">Package not found.</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 className="h3 mb-4 fw-bold">Edit Package</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              name="title"
              className="form-control"
              value={form.title ?? ""}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Suite ID</label>
            <input
              name="suiteId"
              className="form-control"
              value={form.suiteId ?? ""}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Courier</label>
            <input
              name="courier"
              className="form-control"
              value={form.courier ?? ""}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Tracking #</label>
            <input
              name="tracking"
              className="form-control"
              value={form.tracking ?? ""}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Declared Value</label>
            <input
              name="value"
              className="form-control"
              value={form.value ?? ""}
              onChange={handleChange}
              type="number"
            />
          </div>

          <div className="mb-3">
  <label className="form-label">Location (for timeline)</label>
  <input name="location" className="form-control" value={(form as any).location ?? ""} onChange={handleChange} />
</div>
<div className="mb-3">
  <label className="form-label">Note (for timeline)</label>
  <textarea name="note" className="form-control" rows={3} value={(form as any).note ?? ""} onChange={handleChange} />
</div>


          <div className="mb-3">
            <label className="form-label">Status</label>
            <select
              name="status"
              className="form-select"
              value={form.status ?? "Pending"}
              onChange={handleChange}
            >
              <option value="Pending">Pending</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Canceled">Canceled</option>
              <option value="Forwarded">Forwarded</option>
            </select>
          </div>

          {/* NEW: Optional fields for richer tracking events */}
          <div className="mb-3">
            <label className="form-label">Location (for timeline)</label>
            <input
              name="location"
              className="form-control"
              value={(form as any).location ?? ""}
              onChange={handleChange}
              placeholder="e.g., Dubai Hub, DXB"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Note (for timeline)</label>
            <textarea
              name="note"
              className="form-control"
              rows={3}
              value={(form as any).note ?? ""}
              onChange={handleChange}
              placeholder="e.g., consolidated with #GS-2025-AB12"
            />
          </div>

          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="postToTimeline"
              checked={postToTimeline}
              onChange={(e) => setPostToTimeline(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="postToTimeline">
              Post to tracking timeline after update
            </label>
          </div>

          <button className="btn btn-primary" type="submit" disabled={editing}>
            {editing ? "Updating..." : "Update Package"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
