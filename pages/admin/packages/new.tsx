import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";

export default function AddPackagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    suiteId: "",
    courier: "",
    tracking: "",
    value: "",
    status: "Pending",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Redirect if not admin
  if (status === "loading") return null;
  if (!session || session.user?.role !== "admin") {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add package.");
      router.push("/admin/packages");
    } catch (err: any) {
      setError(err.message || "Error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 className="h3 mb-4 fw-bold">Add New Package</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input name="title" className="form-control" value={form.title} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Suite ID</label>
            <input name="suiteId" className="form-control" value={form.suiteId} onChange={handleChange} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Courier</label>
            <input name="courier" className="form-control" value={form.courier} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Tracking</label>
            <input name="tracking" className="form-control" value={form.tracking} onChange={handleChange} />
          </div>
          <div className="mb-3">
            <label className="form-label">Value</label>
            <input name="value" className="form-control" value={form.value} onChange={handleChange} type="number" />
          </div>
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select name="status" className="form-select" value={form.status} onChange={handleChange}>
              <option value="Pending">Pending</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Canceled">Canceled</option>
              <option value="Forwarded">Forwarded</option>
            </select>
          </div>
          <button className="btn btn-success" type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add Package"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
