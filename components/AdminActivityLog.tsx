// components/AdminActivityLog.tsx
import { useEffect, useState } from "react";

type ActivityLog = {
  id: number;
  type: string;
  user: string;
  detail: string;
  date: string;
};

export default function AdminActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/activity")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 my-8">
      <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
      {loading ? (
        <div className="text-gray-500 py-6">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500 py-6">No recent activity.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-3 py-2 text-gray-700">{new Date(log.date).toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium">{log.user}</td>
                  <td className="px-3 py-2">{log.type}</td>
                  <td className="px-3 py-2">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
