import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===== Simple token-bucket limiter (per-IP, edge runtime) =====
const CAPACITY = 60;
const WINDOW_MS = 10 * 60 * 1000;
const FILL_RATE = CAPACITY / WINDOW_MS; // tokens per ms

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

function getIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const ua = req.headers.get("user-agent") ?? "unknown";
  const al = req.headers.get("accept-language") ?? "unknown";
  return `anon:${ua.slice(0,50)}|${al.slice(0,50)}`;
}

function takeToken(key: string) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: CAPACITY, last: now };
  const elapsed = now - b.last;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * FILL_RATE);
  b.last = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { allowed: true, remaining: Math.floor(b.tokens) };
  } else {
    buckets.set(key, b);
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((1 - b.tokens) / FILL_RATE / 1000) };
  }
}

export function middleware(req: NextRequest) {
  // ✅ Bypass the tracking webhook entirely (no rate limit)
  if (req.nextUrl.pathname === "/api/shipping/track-webhook") {
    return NextResponse.next();
  }

  // Only guard other API routes; allow non-API through
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const ip = getIp(req);
  const { allowed, remaining, retryAfter } = takeToken(`api:${ip}`);

  if (!allowed) {
    const res = NextResponse.json(
      { ok: false, error: 'Too Many Requests', hint: 'Try again later.' },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(retryAfter ?? 60));
    res.headers.set('X-RateLimit-Limit', String(CAPACITY));
    res.headers.set('X-RateLimit-Remaining', String(0));
    res.headers.set('X-RateLimit-Window', `${WINDOW_MS / 1000}s`);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(CAPACITY));
  res.headers.set('X-RateLimit-Remaining', String(remaining));
  res.headers.set('X-RateLimit-Window', `${WINDOW_MS / 1000}s`);
  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
