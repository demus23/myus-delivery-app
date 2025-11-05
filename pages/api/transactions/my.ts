//pages\api\transactions\my.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/mongoose";
import Transaction from "@/lib/models/Transaction";
import User from "@/lib/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const sUser: any = session?.user;
  if (!sUser) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  let userId: string | undefined =
    sUser?.id || sUser?._id ? String(sUser.id || sUser._id) : undefined;

  if (!userId && sUser?.email) {
    const u = (await User.findOne({ email: sUser.email }, { _id: 1 }).lean()) as { _id?: any } | null;
    if (u?._id) userId = String(u._id);
  }

  const { limit = "200" } = req.query;

  if (userId) {
    const rows = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    return res.json({ rows });
  }

  // final fallback (dev)
  return res.json({ rows: [] });
}
