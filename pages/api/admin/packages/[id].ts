// pages/api/admin/packages/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { isValidObjectId } from "mongoose"; // cleaner than ObjectId from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  if (req.method === "PUT") {
    const { suiteId, title, tracking, courier, status, value } = req.body;
    await PackageModel.findByIdAndUpdate(
      id,
      { suiteId, title, tracking, courier, status, value },
      { new: true }
    );
    return res.status(200).json({ message: "Package updated" });
  }

  if (req.method === "DELETE") {
    await PackageModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Package deleted" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
