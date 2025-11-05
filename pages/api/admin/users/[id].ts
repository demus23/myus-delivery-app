// pages/api/admin/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

type OkUser = {
  ok?: true;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    membership?: string;
    phone?: string;
    suiteId?: string | null;
    emailVerified?: boolean;
    addresses?: any[];
    paymentMethods?: any[];
    documents?: any[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };
};
type Ok = { ok: true };
type Err = { error: string };

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "admin" || r === "superadmin";
}

// Enforce suite format like "UAE-12345"
const SUITE_RE = /^UAE-\d{5}$/;

function toSafe(u: any): OkUser["user"] {
  return {
    id: (u._id || u.id).toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    membership: u.membership,
    phone: u.phone,
    suiteId: u.suiteId ?? null,
    emailVerified: !!u.emailVerified,
    addresses: u.addresses ?? [],
    paymentMethods: u.paymentMethods ?? [],
    documents: u.documents ?? [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkUser | Ok | Err>
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id || !isAdmin(session)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      const u = await UserModel.findById(id, "-password").lean();
      if (!u) return res.status(404).json({ error: "User not found" });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ user: toSafe(u) });
    }

    if (req.method === "PUT") {
      const {
        name,
        phone,
        membership,
        role: nextRole,
        suiteId,
        subscribed,
        status,
        banned,
      } = req.body || {};

      const user = await UserModel.findById(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Validate format + uniqueness; allow clearing with null/empty string
      if (typeof suiteId === "string") {
        const s = suiteId.trim();
        if (s) {
          if (!SUITE_RE.test(s)) {
            return res.status(400).json({ error: "Suite ID must look like UAE-12345" });
          }
          const taken = await UserModel.exists({ _id: { $ne: user._id }, suiteId: s });
          if (taken) return res.status(409).json({ error: "Suite ID already in use" });
          user.suiteId = s;
        } else {
          user.suiteId = null; // empty string clears
        }
      } else if (suiteId === null) {
        user.suiteId = null; // explicit clear
      }

      if (typeof name === "string") user.name = name;
      if (typeof phone === "string") user.phone = phone;
      if (typeof membership === "string") user.membership = membership;

      // Only superadmins can change roles
      if (typeof nextRole === "string") {
        const requesterRole = (session?.user as any)?.role;
        if (requesterRole !== "superadmin") {
          return res.status(403).json({ error: "Only superadmins can change roles" });
        }
        const allowed = new Set(["user", "admin", "superadmin"]);
        if (!allowed.has(nextRole)) {
          return res.status(400).json({ error: "Invalid role" });
        }
        user.role = nextRole;
      }

      if (typeof subscribed === "boolean") user.subscribed = subscribed;
      if (typeof status === "string") (user as any).status = status;
      if (typeof banned === "boolean") (user as any).banned = banned;

      await user.save();

      // Non-blocking activity log
      try {
        await ActivityLog.create({
          action: "update_user",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: session.user?.email,
          details: {
            name,
            phone,
            membership,
            role: nextRole,
            suiteId: user.suiteId,
            subscribed,
            status,
            banned,
          },
        });
      } catch {}

      const safe = await UserModel.findById(id, "-password").lean();
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ user: toSafe(safe) });
    }

    if (req.method === "DELETE") {
      const found = await UserModel.findById(id);
      if (!found) return res.status(404).json({ error: "User not found" });

      await found.deleteOne();

      // Non-blocking activity log
      try {
        await ActivityLog.create({
          action: "delete_user",
          entity: "user",
          entityId: id,
          performedBy: session.user?.email,
          details: { email: found.email },
        });
      } catch {}

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
