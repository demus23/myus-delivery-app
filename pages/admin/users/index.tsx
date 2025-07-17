import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // For delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.push("/login");
      return;
    }
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [status, session, router]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="h3 fw-bold mb-0">All Users</h2>
          <Link href="/admin/users/new">
            <button className="btn btn-primary">Add User</button>
          </Link>
        </div>
        <input
          className="form-control mb-4"
          placeholder="Search by name, email, role, status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-secondary">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <div className="spinner-border text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === "Super Admin" ? "bg-dark" : "bg-primary"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.status === "Active" ? "bg-success" : "bg-secondary"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="text-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                    </td>
                    <td>
                      <Link href={`/admin/users/${user._id}`}>
                        <button className="btn btn-sm btn-outline-primary">Edit</button>
                      </Link>
                      <button
                        className="btn btn-sm btn-outline-danger ms-2"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Modal */}
        {selectedUser && (
          <div
            className={`modal fade ${showDeleteModal ? "show d-block" : ""}`}
            tabIndex={-1}
            style={{ background: showDeleteModal ? "rgba(0,0,0,0.5)" : "transparent" }}
            aria-labelledby="deleteModalLabel"
            aria-hidden={!showDeleteModal}
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Delete User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  Are you sure you want to delete <strong>{selectedUser.name}</strong>?
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={async () => {
                      // DELETE user by API
                      await fetch(`/api/admin/users/${selectedUser._id}`, { method: "DELETE" });
                      setUsers(users.filter(u => u._id !== selectedUser._id));
                      setShowDeleteModal(false);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
