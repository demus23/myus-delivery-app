import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import InventoryModel from "@/lib/models/Inventory";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();

  if (req.method === "GET") {
    const items = await InventoryModel.find({}).sort({ updatedAt: -1 }).lean();
    return res.status(200).json(items);
  }
  if (req.method === "POST") {
    const { itemName, sku, quantity, location } = req.body;
    if (!itemName || !sku) return res.status(400).json({ error: "Missing fields" });
    const item = await InventoryModel.create({ itemName, sku, quantity, location });
    return res.status(201).json(item);
  }
  if (req.method === "PUT") {
    const { _id, itemName, sku, quantity, location } = req.body;
    if (!_id) return res.status(400).json({ error: "ID required" });
    const updated = await InventoryModel.findByIdAndUpdate(
      _id,
      { itemName, sku, quantity, location, updatedAt: new Date() },
      { new: true }
    );
    return res.status(200).json(updated);
  }
  if (req.method === "DELETE") {
    const { _id } = req.body;
    if (!_id) return res.status(400).json({ error: "ID required" });
    await InventoryModel.findByIdAndDelete(_id);
    return res.status(204).end();
  }

  return res.status(405).json({ error: "Method not allowed" });
}
