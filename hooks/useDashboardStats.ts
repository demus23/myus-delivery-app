// hooks/useDashboardData.ts
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api" 
import type {
  DashboardCounts,
  RecentPackage,
  ActivityLogEntry,
  RevenuePoint,
  SystemHealth,
} from "@/lib/types";

type LoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useDashboardData() {
  const [counts, setCounts] = useState<LoadState<DashboardCounts>>({
    data: null,
    error: null,
    loading: true,
  });
  const [recent, setRecent] = useState<LoadState<RecentPackage[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [activity, setActivity] = useState<LoadState<ActivityLogEntry[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [revenue, setRevenue] = useState<LoadState<RevenuePoint[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [health, setHealth] = useState<LoadState<SystemHealth>>({
    data: null,
    error: null,
    loading: true,
  });

  const fetchAll = useCallback(async () => {
    setCounts((s) => ({ ...s, loading: true }));
    setRecent((s) => ({ ...s, loading: true }));
    setActivity((s) => ({ ...s, loading: true }));
    setRevenue((s) => ({ ...s, loading: true }));
    setHealth((s) => ({ ...s, loading: true }));

    try {
      const [
        countsRes,
        recentRes,
        activityRes,
        revenueRes,
        healthRes,
      ] = await Promise.all([
        api.get<DashboardCounts>("/dashboard/counts"),
        api.get<RecentPackage[]>("/dashboard/recent-packages"),
        api.get<ActivityLogEntry[]>("/dashboard/activity"),
        api.get<RevenuePoint[]>("/dashboard/revenue"),
        api.get<SystemHealth>("/dashboard/health"),
      ]);

      setCounts({ data: countsRes.data, error: null, loading: false });
      setRecent({ data: recentRes.data, error: null, loading: false });
      setActivity({ data: activityRes.data, error: null, loading: false });
      setRevenue({ data: revenueRes.data, error: null, loading: false });
      setHealth({ data: healthRes.data, error: null, loading: false });
    } catch (err) {
      const msg =
        (err as any)?.response?.data?.message ??
        (err as Error).message ??
        "Unknown error";
      setCounts((s) => ({ ...s, error: msg, loading: false }));
      setRecent((s) => ({ ...s, error: msg, loading: false }));
      setActivity((s) => ({ ...s, error: msg, loading: false }));
      setRevenue((s) => ({ ...s, error: msg, loading: false }));
      setHealth((s) => ({ ...s, error: msg, loading: false }));
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(() => {
    void fetchAll();
  }, [fetchAll]);

  const anyLoading =
    counts.loading ||
    recent.loading ||
    activity.loading ||
    revenue.loading ||
    health.loading;

  return {
    counts,
    recent,
    activity,
    revenue,
    health,
    loading: anyLoading,
    refresh,
  };
}
