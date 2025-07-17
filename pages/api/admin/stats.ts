import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import PackageModel from "@/lib/models/Package";

type StatsResult = {
  totalUsers: number;
  totalPackages: number;
  packagesByStatus: Record<string, number>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatsResult>
) {
  await dbConnect();

  const totalUsers = await UserModel.countDocuments();
  const totalPackages = await PackageModel.countDocuments();

  // Fix type: use Record<string, number>
  const packagesByStatus: Record<string, number> = {};
  const packagesByStatusAgg = await PackageModel.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  packagesByStatusAgg.forEach((row: any) => {
    packagesByStatus[row._id] = row.count;
  });

  res.status(200).json({
    totalUsers,
    totalPackages,
    packagesByStatus
  });
}
