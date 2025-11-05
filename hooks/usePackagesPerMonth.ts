import { useEffect, useState } from "react";

// Utility: get 'YYYY-MM' from a date string
function toMonth(date: string) {
  return date?.slice(0, 7) || "";
}

export function usePackagesPerMonth() {
  const [data, setData] = useState<{ [month: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch("/api/admin/packages");
      const pkgs = await res.json();

      // Count packages per month (last 7 months)
      const now = new Date();
      const months = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      });

      const counts: { [month: string]: number } = {};
      months.forEach(m => (counts[m] = 0));
      pkgs.forEach((p: any) => {
        const m = toMonth(p.createdAt || "");
        if (counts[m] !== undefined) counts[m]++;
      });
      setData(counts);
      setLoading(false);
    }
    fetchData();
  }, []);

  return { data, loading };
}
