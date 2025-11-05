const hits = new Map<string, { count: number; ts: number }>();
export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const b = hits.get(key);
  if (!b || now - b.ts > windowMs) { hits.set(key, { count: 1, ts: now }); return true; }
  if (b.count >= limit) return false;
  b.count++; return true;
}
