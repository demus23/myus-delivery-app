// lib/status.ts
export const CANON_STATUS = [
  "Pending","Received","Processing","Shipped","In Transit","Delivered","Cancelled","Forwarded","Problem"
] as const;
export type CanonStatus = typeof CANON_STATUS[number];
export function normalizeStatus(input?: string): CanonStatus | undefined {
  if (!input) return;
  const v = input.trim().toLowerCase().replace(/_/g," ");
  const map: Record<string, CanonStatus> = {
    pending:"Pending", received:"Received", processing:"Processing", shipped:"Shipped",
    "in transit":"In Transit", transit:"In Transit", intransit:"In Transit",
    delivered:"Delivered", cancelled:"Cancelled", canceled:"Cancelled",
    forwarded:"Forwarded", problem:"Problem"
  };
  return map[v];
}
