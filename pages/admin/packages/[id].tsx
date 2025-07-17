import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/AdminLayout";

type Package = {
  _id: string;
  title?: string;
  suiteId?: string;
  courier?: string;
  tracking?: string;
  value?: string;
  status?: string;
  createdAt?: string;
};

export default function EditPackagePage() {
  const { query, push } = useRouter();
  const { data: session, status } = useSession();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [form, setForm] = useState<Partial<Package>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading" || !query.id) return;
    if (!session || session.user?.role !== "admin") {
      push("/login");
      return;
    }
    fetch(`/api/admin/packages/${query.id}`)
      .then((res) => res.json())
      .then((data) => {
        setPkg(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load package.");
        setLoading(false);
      });
  }, [status, session, query, push]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/packages/${query.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update package.");
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
            <input name="title" className="form-control" value={form.title ?? ""} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Suite ID</label>
            <input name="suiteId" className="form-control" value={form.suiteId ?? ""} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Courier</label>
            <input name="courier" className="form-control" value={form.courier ?? ""} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Tracking</label>
            <input name="tracking" className="form-control" value={form.tracking ?? ""} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Value</label>
            <input name="value" className="form-control" value={form.value ?? ""} onChange={handleChange} type="number" />
          </div>
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select name="status" className="form-select" value={form.status ?? "Pending"} onChange={handleChange}>
              <option value="Pending">Pending</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Canceled">Canceled</option>
              <option value="Forwarded">Forwarded</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={editing}>
            {editing ? "Updating..." : "Update Package"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
