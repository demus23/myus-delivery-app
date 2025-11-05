import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    return res.status(200).json({ ok: true, db: "connected", ts: new Date().toISOString() });
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || "db error" });
  }
}
