import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import PackageModel from "@/lib/models/Package";
import InventoryModel from "@/lib/models/Inventory";
import { Activity as ActivityModel } from "@/lib/models/Activity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { type = "packages" } = req.query;

  let data: any[] = []; // <-- Explicit type

  if (type === "users") {
    data = await UserModel.find({}, "-password").sort({ createdAt: -1 }).lean();
  } else if (type === "packages") {
    data = await PackageModel.find({}).sort({ createdAt: -1 }).lean();
  } else if (type === "inventory") {
    data = await InventoryModel.find({}).sort({ updatedAt: -1 }).lean();
  } else if (type === "activity") {
    data = await ActivityModel.find({}).sort({ createdAt: -1 }).lean();
  }

  return res.status(200).json(data);
}
