import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import UserModel, { type IUser } from "@/lib/models/User";

type ApiOk = { ok: true; updated: number };
type ApiErr = { ok: false; error: string };

const isAdmin = (s: Session | null) =>
  !!(s?.user as any)?.role && ["admin", "superadmin"].includes((s?.user as any).role);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  }

  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!isAdmin(session)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  await dbConnect();

  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ ok: false, error: "Database not connected" });
  }

  const cursor = db
    .collection("packages")
    .find({ $or: [{ userId: { $exists: false } }, { userEmail: { $exists: false } }] });

  let updated = 0;

  while (await cursor.hasNext()) {
    const pkg: any = await cursor.next();
    if (!pkg) break;

    let user: IUser | null = null;

    if (pkg.suiteId) {
      user = await UserModel.findOne({ suiteId: pkg.suiteId }).lean<IUser | null>().exec();
    }
    if (!user && pkg.userEmail) {
      user = await UserModel.findOne({ email: pkg.userEmail }).lean<IUser | null>().exec();
    }
    if (!user) continue;

    const update: Record<string, any> = {};
    if (!pkg.userId && user._id) update.userId = user._id;
    if (!pkg.userEmail && user.email) update.userEmail = user.email;

    if (Object.keys(update).length) {
      await db.collection("packages").updateOne({ _id: pkg._id }, { $set: update });
      updated++;
    }
  }

  return res.status(200).json({ ok: true, updated });
}
