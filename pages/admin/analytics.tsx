import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto"; // required for react-chartjs-2 v4+

export default function AdminAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetch("/api/admin/analytics")
        .then(res => res.json())
        .then(setStats);
    }
  }, [status, session]);

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    if (typeof window !== "undefined") router.push("/login");
    return <div>Redirecting...</div>;
  }
  if (!stats) return <div>Loading analytics...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 28 }}>Business Analytics Dashboard</h1>
      <div style={{ display: "flex", gap: 30, marginBottom: 32 }}>
        <div style={{ background: "#f9fafb", padding: 24, borderRadius: 16, flex: 1 }}>
          <div style={{ fontSize: 16 }}>Total Packages</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{stats.totalPackages}</div>
        </div>
        <div style={{ background: "#f9fafb", padding: 24, borderRadius: 16, flex: 1 }}>
          <div style={{ fontSize: 16 }}>Total Users</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{stats.totalUsers}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 36, alignItems: "flex-end" }}>
        <div style={{ background: "#fff", padding: 18, borderRadius: 16, flex: 2 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Packages per Month</h2>
          <Bar
            data={{
              labels: stats.packagesPerMonth.map((p: any) => p.month),
              datasets: [{ label: "Packages", data: stats.packagesPerMonth.map((p: any) => p.count), backgroundColor: "#6366f1" }]
            }}
          />
        </div>
        <div style={{ background: "#fff", padding: 18, borderRadius: 16, flex: 1 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Package Status</h2>
          <Pie
            data={{
              labels: Object.keys(stats.statusBreakdown),
              datasets: [{ data: Object.values(stats.statusBreakdown), backgroundColor: ["#b99806", "#1754a1", "#107c10", "#c82333"] }]
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 42 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12 }}>Recent User Signups</h2>
        <ul>
          {stats.recentUsers.map((u: any) => (
            <li key={u._id}>
              {u.name || u.email} — joined {new Date(u.createdAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
