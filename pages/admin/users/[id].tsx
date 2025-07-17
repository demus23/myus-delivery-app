import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";

type User = {
  _id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default function EditUserPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === "new";

  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    role: "Admin",
    status: "Active",
  });
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  // Load user for editing
  useEffect(() => {
    if (!isNew && id) {
      fetch(`/api/admin/users/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data);
          setLoading(false);
        })
        .catch(() => setError("Failed to load user"));
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  // Save handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = isNew
      ? "/api/admin/users"
      : `/api/admin/users/${id}`;
    const method = isNew ? "POST" : "PUT";
    const body = JSON.stringify(user);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      setError("Failed to save user.");
      return;
    }
    router.push("/admin/users");
  };

  if (loading) return <AdminLayout><div>Loading…</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="container" style={{ maxWidth: 520 }}>
        <h2 className="mb-4">{isNew ? "Add New User" : "Edit User"}</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={user.name}
              onChange={e => setUser({ ...user, name: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={user.email}
              onChange={e => setUser({ ...user, email: e.target.value })} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Role</label>
            <select className="form-select" value={user.role}
              onChange={e => setUser({ ...user, role: e.target.value })}>
              <option value="Admin">Admin</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select className="form-select" value={user.status}
              onChange={e => setUser({ ...user, status: e.target.value })}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button className="btn btn-primary me-2" type="submit">
            {isNew ? "Add User" : "Save Changes"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => router.push("/admin/users")}>Cancel</button>
        </form>
      </div>
    </AdminLayout>
  );
}
