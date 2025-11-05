import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import UserModel from "@/lib/models/User";

function getMonthLabel(date: Date) {
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();

  // Total counts
  const totalPackages = await PackageModel.countDocuments();
  const totalUsers = await UserModel.countDocuments();

  // Packages per month (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: getMonthLabel(d) };
  });

  // Packages per month
  const packagesPerMonth = await Promise.all(months.map(async ({ year, month, label }) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const count = await PackageModel.countDocuments({
      createdAt: { $gte: start, $lt: end }
    });
    return { month: label, count };
  }));

  // Package status breakdown
  const statuses = ["Pending", "Shipped", "Delivered", "Cancelled"];
  const statusBreakdown: Record<string, number> = {};
  for (const status of statuses) {
    statusBreakdown[status] = await PackageModel.countDocuments({ status });
  }

  // Recent users (last 10)
  const recentUsers = await UserModel.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.status(200).json({
    totalPackages,
    totalUsers,
    packagesPerMonth,
    statusBreakdown,
    recentUsers,
  });
}
