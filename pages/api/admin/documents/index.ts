import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "admin" || r === "superadmin";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!isAdmin(session)) return res.status(403).json({ error: "Forbidden" });

  await dbConnect();

  // optional filters
  const { email, userId, limit } = req.query as { email?: string; userId?: string; limit?: string };
  const match: any = {};
  if (email) match.email = email;
  if (userId) match._id = userId;

  const l = Math.max(1, Math.min(200, Number(limit) || 50));

  const rows = await User.aggregate([
    { $match: match },
    { $project: { email: 1, suiteId: 1, documents: 1 } },
    { $unwind: "$documents" },
    { $sort: { "documents.uploadedAt": -1 } },
    { $limit: l },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        userEmail: "$email",
        suiteId: "$suiteId",
        docId: "$documents._id",
        label: "$documents.label",
        filename: "$documents.filename",
        url: "$documents.url",
        uploadedAt: "$documents.uploadedAt",
      },
    },
  ]);

  return res.status(200).json({ documents: rows });
}
