// pages/api/dev/seed-track.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import TrackingEventModel from "@/lib/models/TrackingEvent";

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s_-]/g, "");
}
function pickEnum(target: string, enums: string[]) {
  if (!enums?.length) return target;
  const table = new Map(enums.map((e) => [normalize(e), e]));
  const want = normalize(target);
  if (table.has(want)) return table.get(want)!;
  // try common aliases, in order
  const aliases = [
    want,
    "outfordelivery",
    "intransit",
    "delivered",
    "exception",
    "created",
    "pending",
    "problem"
  ];
  for (const a of aliases) if (table.has(a)) return table.get(a)!;
  return enums[0]; // fallback to first enum value
}

export default async function seed(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    const trackingNo = (req.query.tracking as string) || (req.query.trackingNo as string) || "AB23456";

    // Read enum values from schema
    const statusPath: any = TrackingEventModel.schema.path("status");
    const enumValues: string[] =
      statusPath?.options?.enum || statusPath?.enumValues || [];

    // Ensure a Package exists because your event requires packageId
    let pkg = await PackageModel.findOne({ tracking: trackingNo });
    if (!pkg) {
      // If Package has its own enum for status, set a safe string or omit
      pkg = await PackageModel.create({
        tracking: trackingNo,
        courier: "Aramex",
        status: "Delivered", // adjust if your Package model has an enum; otherwise a string is fine
        location: "dubai",
      });
    }

    const now = Date.now();
    const e1 = pickEnum("in_transit", enumValues);
    const e2 = pickEnum("delivered", enumValues);

    const docs = [
      {
        trackingNo,
        packageId: pkg._id,
        status: e1,
        location: "Riyadh, SA",
        note: "Arrived at facility",
        createdAt: new Date(now - 2 * 60 * 60 * 1000),
      },
      {
        trackingNo,
        packageId: pkg._id,
        status: e2,
        location: "Riyadh, SA",
        note: "Delivered to recipient",
        createdAt: new Date(now - 30 * 60 * 1000),
      },
    ];

    const inserted = await TrackingEventModel.insertMany(docs);
    return res.status(200).json({ ok: true, inserted: inserted.length, trackingNo, packageId: String(pkg._id), usedEnum: enumValues });
 } catch (e: unknown) {
  // best-effort message extraction
  const msg =
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
      ? (e as { message: string }).message
      : "Server error";

  console.error("seed-track error:", e);
  return res.status(500).json({ ok: false, error: msg });
}

}
