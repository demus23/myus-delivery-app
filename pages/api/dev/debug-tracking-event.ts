// pages/api/dev/debug-tracking-event.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import TrackingEventModel from "@/lib/models/TrackingEvent";
import { errorMessage } from "@/utils/errors";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    const path = TrackingEventModel.schema.path("status") as any;
    const enums: string[] =
      path?.options?.enum || path?.enumValues || [];
    return res.status(200).json({
      ok: true,
      enumValues: enums,
      schemaPaths: Object.keys(TrackingEventModel.schema.paths),
      required: Object.entries(TrackingEventModel.schema.paths)
        .filter(([, p]: any) => p.isRequired)
        .map(([k]) => k),
    });
} catch (e: unknown) {
  console.error(e);
  return res.status(500).json({ ok: false, error: errorMessage(e) || "error" });
}
}
