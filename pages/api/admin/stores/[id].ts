import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Store from "@/lib/models/Store";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const store = await Store.findById(id);
    if (!store) return res.status(404).json({ error: "Store not found" });
    return res.status(200).json(store);
  }

  if (req.method === "PUT") {
    const { name, address, phone, email } = req.body;
    const store = await Store.findByIdAndUpdate(
      id,
      { name, address, phone, email },
      { new: true }
    );
    if (!store) return res.status(404).json({ error: "Store not found" });
    return res.status(200).json(store);
  }

  if (req.method === "DELETE") {
    await Store.findByIdAndDelete(id);
    return res.status(204).end();
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
