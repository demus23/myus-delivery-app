import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import { Types } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";
import type { Session } from "next-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
const role = (session?.user as any)?.role;

  if (!session || (role !== "admin" && role !== "superadmin")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query as { id: string };
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  await dbConnect();

  // Make sure we have the user
  const user = await UserModel.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const previousSuiteId = user.suiteId ?? null;

  // Try a few times in case of duplicate collisions (unique index recommended)
  let newSuiteId: string | null = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const candidate = await generateUniqueSuiteId("UAE");
      user.suiteId = candidate;
      await user.save(); // may throw 11000 if unique index exists and we hit a collision
      newSuiteId = candidate;
      break;
    } catch (err: any) {
      // Duplicate key error on unique index for suiteId
      if (err?.code === 11000 && err?.keyPattern?.suiteId) {
        continue; // try a new candidate
      }
      // Unexpected error
      return res.status(500).json({ error: err?.message || "Unexpected error" });
    }
  }

  if (!newSuiteId) {
    return res.status(503).json({ error: "Could not generate a unique suiteId. Please retry." });
  }

  // Activity log (more context)
  try {
    await ActivityLog.create({
      action: "regenerate_suite",
      entity: "user",
      entityId: user._id.toString(),
      performedBy: session.user?.email,
      details: { previousSuiteId, suiteId: newSuiteId },
    });
  } catch {
    // non-fatal—don’t block the response if logging fails
  }

  // Sanitize user for return
  const safe = await UserModel.findById(id, "-password -__v").lean();

  // Back-compat: return the full user (your original shape), plus a small data payload
  return res.status(200).json({
    user: safe,
    data: { userId: user._id.toString(), previousSuiteId, suiteId: newSuiteId },
  });
}

async function generateUniqueSuiteId(prefix = "UAE"): Promise<string> {
  // e.g., UAE-12345 (5 digits). Adjust length if you want.
  for (let i = 0; i < 12; i++) {
    const n = Math.floor(10000 + Math.random() * 90000);
    const candidate = `${prefix}-${n}`;
    const taken = await UserModel.findOne({ suiteId: candidate }).select("_id").lean();
    if (!taken) return candidate;
  }
  // Fallback: time-sliced
  return `${prefix}-${Date.now().toString().slice(-5)}`;
}
