import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Store from "@/lib/models/Store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "GET") {
    // List all stores
    const stores = await Store.find().sort({ createdAt: -1 });
    return res.status(200).json(stores);
  }

  if (req.method === "POST") {
    // Add new store
    const { name, address, phone, email } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: "Name and address are required." });
    }
    const store = await Store.create({ name, address, phone, email });
    return res.status(201).json(store);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
