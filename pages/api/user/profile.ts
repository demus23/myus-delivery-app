// pages/api/user/profile.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

type Profile = {
  name: string;
  email: string;
  phone?: string;
  membership?: "Free" | "Premium" | "Pro" | string;
  subscribed?: boolean;
  suiteId?: string | null;
  role?: string;
};

type Err = { error: string };

const MEMBERSHIP_ALLOWED = new Set(["Free", "Premium", "Pro"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Profile | Err>
) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const user = await UserModel.findById(session.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      membership: user.membership || "Free",
      subscribed: !!user.subscribed,
      suiteId: user.suiteId ?? null,
      role: user.role || "user",
    });
  }

  if (req.method === "PUT") {
    const { name, email, phone, membership, subscribed } = req.body || {};

    if (typeof name === "string") user.name = name.trim();
    if (typeof phone === "string") user.phone = phone.trim();

    if (typeof membership === "string" && MEMBERSHIP_ALLOWED.has(membership)) {
      user.membership = membership;
    }

    if (typeof subscribed === "boolean") {
      user.subscribed = subscribed;
    }

    if (typeof email === "string") {
      const nextEmail = email.trim().toLowerCase();
      if (nextEmail && nextEmail !== (user.email || "").toLowerCase()) {
        const taken = await UserModel.exists({ _id: { $ne: user._id }, email: nextEmail });
        if (taken) return res.status(409).json({ error: "Email already in use" });
        user.email = nextEmail;
        // require re-verify on change
        (user as any).emailVerified = false;
      }
    }

    await user.save();

    // activity log (non-blocking)
    try {
      await ActivityLog.create({
        action: "user_update_profile",
        entity: "user",
        entityId: user._id.toString(),
        performedBy: session.user?.email,
        details: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          membership: user.membership,
          subscribed: user.subscribed,
        },
      });
    } catch {}

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      membership: user.membership || "Free",
      subscribed: !!user.subscribed,
      suiteId: user.suiteId ?? null,
      role: user.role || "user",
    });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
