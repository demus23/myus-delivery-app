// pages/api/admin/drivers/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import DriverModel from "@/lib/models/Driver";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();

  if (req.method === "GET") {
    const drivers = await DriverModel.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json(drivers);
  }

  if (req.method === "POST") {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone)
      return res.status(400).json({ error: "Missing fields" });
    const driver = await DriverModel.create({ name, email, phone });
    return res.status(201).json(driver);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
