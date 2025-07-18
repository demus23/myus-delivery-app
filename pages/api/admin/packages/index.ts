// pages/api/admin/packages/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "GET") {
    const packages = await PackageModel.find({}).sort({ createdAt: -1 }).lean();
    // You can transform or filter fields as needed
    return res.status(200).json(packages);
  }

  if (req.method === "POST") {
    const { suiteId, title, tracking, courier, status, value } = req.body;
    const newPkg = await PackageModel.create({
      suiteId,
      title,
      tracking,
      courier,
      status,
      value,
      createdAt: new Date(),
    });
    return res.status(201).json(newPkg);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
