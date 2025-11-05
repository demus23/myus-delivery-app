// /pages/api/shipments/pending.ts
import type { NextApiRequest, NextApiResponse } from "next";

type DraftEntry = { draft: any; ts: number };

const g = global as any;
if (!g.__SHIP_DRAFT_STORE__) {
  g.__SHIP_DRAFT_STORE__ = new Map<string, DraftEntry>();
}
const store: Map<string, DraftEntry> = g.__SHIP_DRAFT_STORE__;

// Remove drafts older than 30 minutes
function gc() {
  const now = Date.now();
  const ttl = 1000 * 60 * 30;
  store.forEach((v, k) => {
    if (now - v.ts > ttl) store.delete(k);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  gc();

  if (req.method === "POST") {
    const { pid, draft } = (req.body ?? {}) as { pid?: string; draft?: any };
    if (!pid || draft === undefined) {
      res.status(400).json({ ok: false, error: "pid and draft are required" });
      return;
    }
    store.set(String(pid), { draft, ts: Date.now() });
    res.json({ ok: true });
    return;
  }

  if (req.method === "GET") {
    const q = (req.query ?? {}) as { pid?: string; latest?: string };

    // Return the most recent draft
    if (q.latest === "1") {
      let newestTs = -1;
      let newestId: string | undefined;
      let newestEntry: DraftEntry | undefined;

      store.forEach((entry, id) => {
        if (entry.ts > newestTs) {
          newestTs = entry.ts;
          newestId = id;
          newestEntry = entry;
        }
      });

      if (!newestEntry || !newestId) {
        res.status(404).json({ ok: false, error: "not found" });
        return;
      }
      res.json({ ok: true, pid: newestId, draft: newestEntry.draft });
      return;
    }

    // Return draft by pid
    if (!q.pid) {
      res.status(400).json({ ok: false, error: "pid is required" });
      return;
    }
    const hit = store.get(String(q.pid));
    if (!hit) {
      res.status(404).json({ ok: false, error: "not found" });
      return;
    }
    res.json({ ok: true, draft: hit.draft });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ ok: false, error: "Method Not Allowed" });
}
