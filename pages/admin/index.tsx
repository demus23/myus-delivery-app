import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type StatsData = {
  totalUsers: number;
  totalPackages: number;
  packagesByStatus: { [key: string]: number };
};

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type Package = {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentPackages, setRecentPackages] = useState<Package[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(res => res.json()),
      fetch("/api/admin/packages").then(res => res.json()),
      fetch("/api/admin/users").then(res => res.json()),
    ]).then(([statsData, packagesData, usersData]) => {
      setStats(statsData);
      setRecentPackages(Array.isArray(packagesData) ? packagesData.slice(0, 5) : []);
      setRecentUsers(Array.isArray(usersData) ? usersData.slice(0, 5) : []);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) return (
    <AdminLayout>
      <div className="container-fluid">
        <div className="py-5 text-center">
          <div className="spinner-border text-primary" />
        </div>
      </div>
    </AdminLayout>
  );

  // Prepare chart data from stats
  const statusKeys = Object.keys(stats.packagesByStatus || {});
  const statusValues = statusKeys.map(key => stats.packagesByStatus[key]);
  const chartData = {
    labels: statusKeys,
    datasets: [{
      label: "Packages",
      data: statusValues,
      backgroundColor: [
        "#ffc107", "#0dcaf0", "#198754", "#6c757d", "#bb86fc", "#fd7e14", "#dc3545"
      ]
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Packages by Status" }
    }
  };

  return (
    <AdminLayout>
      <div className="container-fluid">
        {/* Stat Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <div className="card text-bg-primary shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Total Users</h5>
                <p className="card-text fs-2 fw-bold mb-0">{stats.totalUsers ?? "-"}</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-bg-success shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Total Packages</h5>
                <p className="card-text fs-2 fw-bold mb-0">{stats.totalPackages ?? "-"}</p>
              </div>
            </div>
          </div>
          {Object.entries(stats.packagesByStatus || {}).map(([status, value], idx) => (
            <div className="col-md-3" key={status}>
              <div className="card text-bg-light shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{status}</h5>
                  <p className="card-text fs-3 fw-bold mb-0">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="mb-4 p-4 bg-white rounded shadow-sm">
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Recent Packages */}
        <div className="card mb-4">
          <div className="card-header bg-secondary text-white">Recent Packages</div>
          <div className="card-body p-0">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPackages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-3">No recent packages.</td>
                  </tr>
                ) : (
                  recentPackages.map(pkg => (
                    <tr key={pkg._id}>
                      <td>{pkg.title}</td>
                      <td>
                        <span className={`badge ${pkg.status === "Delivered" ? "bg-success" : "bg-secondary"}`}>{pkg.status}</span>
                      </td>
                      <td>{pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString() : ""}</td>
                      <td>
                        <a href={`/admin/packages/${pkg._id}`} className="btn btn-sm btn-primary">View/Edit</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Admin Users */}
        <div className="card mb-4">
          <div className="card-header bg-secondary text-white">Admin Users</div>
          <div className="card-body p-0">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-3">No users found.</td>
                  </tr>
                ) : (
                  recentUsers.map(user => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`badge ${user.status === "Active" ? "bg-success" : "bg-secondary"}`}>{user.status}</span>
                      </td>
                      <td>
                        <a href={`/admin/users/${user._id}`} className="btn btn-sm btn-outline-primary me-2">Edit</a>
                        {/* You can add remove/delete if needed */}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
