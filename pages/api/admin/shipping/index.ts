import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Shipping from "@/lib/models/Shipping";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();

  if (req.method === "GET") {
    // Optional: Add filter/search/query support here
    const shippings = await Shipping.find({})
      .populate("package", "tracking")
      .populate("user", "name email")
      .populate("driver", "name")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(shippings);
  }

  if (req.method === "POST") {
    const { package: pkg, user, driver, status, shippedAt, deliveredAt, notes } = req.body;
    if (!pkg || !user) return res.status(400).json({ error: "Missing fields" });
    const shipping = await Shipping.create({ package: pkg, user, driver, status, shippedAt, deliveredAt, notes });
    return res.status(201).json(shipping);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
