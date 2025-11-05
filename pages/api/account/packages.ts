import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import UserModel, { type IUser } from "@/lib/models/User";

type PackageDoc = {
  _id: any;
  tracking: string;
  courier?: string;
  value?: number;
  status?: string;
  userId?: any;
  userEmail?: string;
  suiteId?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type ApiOk = { ok: true; packages: PackageDoc[] };
type ApiErr = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session?.user?.email) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  await dbConnect();

  // Always match user by normalized email + suiteId (when present)
  const emailLc = String(session.user.email).trim().toLowerCase();

  const user = await UserModel.findOne({ email: emailLc })
    .lean<IUser | null>()
    .exec();

  if (!user) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ ok: false, error: "Database not connected" });
  }

  const or: Record<string, any>[] = [];
  if (user._id) or.push({ userId: user._id });
  if (user.suiteId) or.push({ suiteId: user.suiteId });
  // IMPORTANT: force lower-case for matching
  or.push({ userEmail: emailLc });

  const query = { $or: or };

  const packages = (await db
    .collection("packages")
    .find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray()) as unknown as PackageDoc[];

  return res.status(200).json({ ok: true, packages });
}
