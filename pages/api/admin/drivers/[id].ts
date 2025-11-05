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

  const { id } = req.query;

  if (req.method === "DELETE") {
    await DriverModel.findByIdAndDelete(id);
    return res.status(204).end();
  }

  if (req.method === "PATCH") {
    const { name, email, phone } = req.body;
    const driver = await DriverModel.findByIdAndUpdate(
      id,
      { name, email, phone },
      { new: true }
    );
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    return res.status(200).json(driver);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
