import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  await dbConnect();

  // totals by status
  const byStatus = await PackageModel.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // top suites by volume (last 30 days optional)
  const topSuites = await PackageModel.aggregate([
    // { $match: { createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } } },
    { $group: { _id: "$suiteId", count: { $sum: 1 } } },
    { $match: { _id: { $ne: null } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const total = await PackageModel.estimatedDocumentCount();

  res.status(200).json({
    total,
    byStatus,     // [{ _id: "Pending", count: 12 }, ...]
    topSuites,    // [{ _id: "UAE 1234", count: 8 }, ...]
  });
}
