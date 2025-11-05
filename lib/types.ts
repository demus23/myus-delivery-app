// lib/types.ts
export type ISODateString = string;

export interface DashboardCounts {
  users: number;
  packages: number;
  revenueToday: number;
  activeDrivers: number;
}

export interface RecentPackage {
  _id: string;
  trackingNumber: string;
  userName: string;
  status: "created" | "in_transit" | "delivered" | "exception";
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ActivityLogEntry {
  _id: string;
  actor: string;
  action: string;
  entity?: string;
  createdAt: ISODateString;
}

export interface RevenuePoint {
  date: ISODateString; // e.g. "2025-08-01"
  amount: number;
}

export interface SystemHealth {
  dbConnected: boolean;
  apiLatencyMs: number;
  queueDepth: number;
}

export interface DashboardResponse {
  counts: DashboardCounts;
  recentPackages: RecentPackage[];
  activity: ActivityLogEntry[];
  revenueSeries: RevenuePoint[];
  systemHealth: SystemHealth;
}
