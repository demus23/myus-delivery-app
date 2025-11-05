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

  let userId: string | undefined = sUser?.id || sUser?._id ? String(sUser.id || sUser._id) : undefined;
  if (!userId && sUser?.email) {
    const u = (await User.findOne({ email: sUser.email }, { _id: 1 }).lean()) as { _id?: any } | null;
    if (u?._id) userId = String(u._id);
  }
  if (!userId) return res.status(400).json({ error: "Could not resolve user id" });

  const row = await Transaction.create({
    user: userId,
    amount: 49, // AED 49.00
    currency: "AED",
    status: "pending",
    description: "Seeded test payment",
    method: { type: "link" },
    processor: { name: "stripe" },
  });

  res.json({ ok: true, row });
}
