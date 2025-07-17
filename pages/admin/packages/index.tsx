import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
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

export default function AdminPackagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "admin") {
      router.push("/login");
      return;
    }
    fetch("/api/admin/packages")
      .then((res) => res.json())
      .then((data) => {
        setPackages(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [status, session, router]);

  const filtered = packages.filter(
    (pkg) =>
      (pkg.title?.toLowerCase().includes(search.toLowerCase()) ||
        pkg.suiteId?.toLowerCase().includes(search.toLowerCase()) ||
        pkg.tracking?.toLowerCase().includes(search.toLowerCase()) ||
        pkg.status?.toLowerCase().includes(search.toLowerCase())) ?? false
  );

  return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="h3 fw-bold mb-0">All Packages</h2>
          <Link href="/admin/packages/new">
            <button className="btn btn-success">Add Package</button>
          </Link>
        </div>
        <input
          className="form-control mb-4"
          placeholder="Search by title, suite, tracking, status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-responsive bg-white rounded shadow-sm">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-secondary">
              <tr>
                <th>Title</th>
                <th>Suite ID</th>
                <th>Courier</th>
                <th>Tracking</th>
                <th>Value</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    <div className="spinner-border text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No packages found.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => (
                  <tr key={pkg._id}>
                    <td>{pkg.title}</td>
                    <td>{pkg.suiteId}</td>
                    <td>{pkg.courier}</td>
                    <td>{pkg.tracking}</td>
                    <td>{pkg.value}</td>
                    <td>
                      <span className={
                        "badge " +
                        (pkg.status === "Delivered"
                          ? "bg-success"
                          : pkg.status === "Pending"
                          ? "bg-warning text-dark"
                          : pkg.status === "Shipped"
                          ? "bg-info text-dark"
                          : pkg.status === "Forwarded"
                          ? "bg-primary"
                          : "bg-secondary")
                      }>
                        {pkg.status}
                      </span>
                    </td>
                    <td className="text-nowrap">
                      {pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : ""}
                    </td>
                    <td>
  <Link href={`/admin/packages/${pkg._id}`}>
    <button className="btn btn-sm btn-outline-primary">View/Edit</button>
  </Link>
  <button
    className="btn btn-sm btn-outline-danger ms-2"
    onClick={() => {
      setSelectedPackage(pkg);
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
      </div>
      {selectedPackage && (
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
          <h5 className="modal-title">Delete Package</h5>
          <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
        </div>
        <div className="modal-body">
          Are you sure you want to delete <strong>{selectedPackage.title}</strong>?
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={async () => {
              // Call your DELETE API here
              await fetch(`/api/admin/packages/${selectedPackage._id}`, { method: "DELETE" });
              setPackages(packages.filter(pkg => pkg._id !== selectedPackage._id));
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

    </AdminLayout>
  );
}
