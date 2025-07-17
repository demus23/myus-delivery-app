import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

type Stats = {
  packagesByStatus: Record<string, number>;
};

export default function AdminStatsChart() {
  const [data, setData] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(res => res.json())
      .then((stats: Stats) => {
        if (stats && stats.packagesByStatus) {
          setData(
            Object.entries(stats.packagesByStatus).map(([status, count]) => ({
              status,
              count,
            }))
          );
        }
      });
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 my-8">
      <h3 className="text-xl font-bold mb-4">Packages by Status</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#4ED1B3" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="count" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
