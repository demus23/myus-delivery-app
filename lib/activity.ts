import type { NextApiRequest } from "next";
import mongoose from "mongoose";
import { Activity } from "@/lib/models/Activity";

type LogArgs = {
  action: string;               // e.g. "charge.created", "paylink.created", "payment.succeeded"
  entity: string;               // e.g. "payment"
  entityId?: string;            // we’ll store invoiceNo here
  performedById?: string | mongoose.Types.ObjectId;
  performedByEmail?: string;
  details?: any;                // anything useful: amounts, stripe ids, status changes
};

export async function logActivity(req: NextApiRequest | null, args: LogArgs) {
  try {
    const ip =
      (req?.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req?.socket as any)?.remoteAddress ||
      undefined;

    const ua = req?.headers["user-agent"] as string | undefined;

    await Activity.create({
      action: args.action,
      entity: args.entity,
      entityId: args.entityId,
      performedBy: args.performedById
        ? new mongoose.Types.ObjectId(String(args.performedById))
        : undefined,
      performedByEmail: args.performedByEmail,
      details: args.details,
      ip,
      ua,
      createdAt: new Date(),
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[logActivity]", args, e);
    }
  }
}
