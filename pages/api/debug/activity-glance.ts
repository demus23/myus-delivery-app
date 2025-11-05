import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
// If your model file is Activity.ts use the next line:
import { Activity } from "@/lib/models/Activity";
// If your model file is ActivityLog.ts instead, use:
// import ActivityLog from "@/lib/models/ActivityLog";
import { errorMessage } from "@/utils/errors";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    // Swap Activity -> ActivityLog here if your model is named ActivityLog
    const [total, payments, packages, sample] = await Promise.all([
      Activity.countDocuments({}),
      Activity.countDocuments({ entity: "payment" }),
      Activity.countDocuments({ entity: "package" }),
      Activity.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.status(200).json({
      ok: true,
      counts: { total, payment: payments, package: packages },
      sample: sample.map((s: any) => ({
        _id: String(s._id),
        entity: s.entity,
        action: s.action,
        createdAt: s.createdAt,
      })),
    });
 } catch (e: unknown) {
  console.error(e);
  return res.status(500).json({ ok: false, error: errorMessage(e) || "Server error" });
}
}