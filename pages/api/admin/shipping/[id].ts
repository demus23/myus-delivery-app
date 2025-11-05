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
  const { id } = req.query;

  if (req.method === "PATCH") {
    const { package: pkg, user, driver, status, shippedAt, deliveredAt, notes } = req.body;
    const shipping = await Shipping.findByIdAndUpdate(
      id,
      { package: pkg, user, driver, status, shippedAt, deliveredAt, notes },
      { new: true }
    );
    return res.status(200).json(shipping);
  }

  if (req.method === "DELETE") {
    await Shipping.findByIdAndDelete(id);
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
