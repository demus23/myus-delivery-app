import type { NextApiRequest } from "next";
import connectDB from "@/lib/db";
import { Activity } from "@/lib/models/Activity";
import mongoose from "mongoose";

type LogArgs = {
  action: string;
  entity: string;
  entityId?: string;
  details?: any;
  userId?: string;
  email?: string;
};

export async function logActivity(req: NextApiRequest, args: LogArgs) {
  try {
    await connectDB();
    const ip =
      (req.headers["x-forwarded-for"]?.toString().split(",")[0] ??
        req.socket.remoteAddress ??
        "") as string;
    const ua = (req.headers["user-agent"] as string) || "";

    await Activity.create({
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      details: args.details,
      performedBy:
        args.userId && mongoose.isValidObjectId(args.userId)
          ? new mongoose.Types.ObjectId(args.userId)
          : undefined,
      performedByEmail: args.email,
      ip,
      ua,
      createdAt: new Date(),
    });
  } catch (e) {
    // don’t crash the request if logging fails
    console.error("[audit] logActivity error:", (e as any)?.message || e);
  }
}
