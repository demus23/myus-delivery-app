import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Promotion from "@/lib/models/Promotion";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "GET") {
    const promotions = await Promotion.find().sort({ endDate: -1 });
    return res.status(200).json(promotions);
  }

  if (req.method === "POST") {
    const { title, endDate } = req.body;
    if (!title || !endDate) return res.status(400).json({ error: "Title and End Date are required" });
    const promotion = await Promotion.create({ title, endDate, status: "Active" });
    return res.status(201).json(promotion);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
