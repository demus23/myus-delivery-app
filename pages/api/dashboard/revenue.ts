import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import  Package  from "@/lib/models/Package";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  // Simple last 14 days revenue from Package.amount
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const series = await Package.aggregate([
    { $match: { updatedAt: { $gte: since } } },
    {
      $group: {
        _id: {
          y: { $year: "$updatedAt" },
          m: { $month: "$updatedAt" },
          d: { $dayOfMonth: "$updatedAt" },
        },
        amount: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: { year: "$_id.y", month: "$_id.m", day: "$_id.d" },
        },
        amount: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  res.status(200).json(
    series.map((p) => ({
      date: new Date(p.date).toISOString().slice(0, 10),
      amount: p.amount,
    }))
  );
}
