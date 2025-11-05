// pages/api/admin/backfill-suites.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "../../../lib/db";
import User from "../../../lib/models/User";
import { generateUniqueSuiteId } from "../../../lib/suite";

type Json =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Json>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    await connectDB();

    // Users missing suiteId (null, undefined, or empty string)
    const users = await (User as any).find({
      $or: [{ suiteId: { $exists: false } }, { suiteId: null }, { suiteId: "" }],
    });

    let updated = 0;

    for (const u of users) {
      // generateUniqueSuiteId is a sync helper returning a string
      const suite = generateUniqueSuiteId();
      u.suiteId = suite;
      // if you still have a legacy 'suite' field, keep them in sync:
      if (!u.suite) u.suite = suite;
      await u.save();
      updated++;
    }

    return res.status(200).json({ ok: true, updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ ok: false, error: msg });
  }
}
