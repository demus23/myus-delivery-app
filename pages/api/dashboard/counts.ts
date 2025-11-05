import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import User from "@/lib/models/User";
import Package from "@/lib/models/Package";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const [users, packages, revenueToday, activeDrivers] = await Promise.all([
    User.countDocuments({}),
    Package.countDocuments({}),
    Package.aggregate([
      {
        $match: {
          updatedAt: {
            $gte: new Date(new Date().toDateString()), // today 00:00
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).then((r: Array<{ total?: number }>) => (r[0]?.total ?? 0)),

    User.countDocuments({ isDriver: true, isActive: true }),
  ]);

  res.status(200).json({
    users,
    packages,
    revenueToday,
    activeDrivers,
  });
}
