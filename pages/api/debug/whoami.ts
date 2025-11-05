import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/mongoose";
import User from "@/lib/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session: any = await getServerSession(req, res, authOptions as any);
  const sUser: any = session?.user || null;

  await dbConnect();

  let resolvedId: string | null = null;
  let found: any = null;

  if (sUser?.id || sUser?._id) {
    resolvedId = String(sUser.id || sUser._id);
  } else if (sUser?.email) {
    found = await User.findOne({ email: sUser.email }, { _id: 1, email: 1 }).lean();
    if (found?._id) resolvedId = String(found._id);
  }

  res.json({
    ok: true,
    sessionUser: { id: sUser?.id, _id: sUser?._id, email: sUser?.email, role: sUser?.role },
    resolvedId,
    foundFromEmail: found,
  });
}
