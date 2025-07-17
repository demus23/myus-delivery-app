// pages/api/admin/packages/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("gulfship");
  const collection = db.collection("packages");
  const { id } = req.query;

  if (!ObjectId.isValid(id as string)) {
    return res.status(400).json({ message: "Invalid ID" });
  }

  if (req.method === "PUT") {
    const { suiteId, title, tracking, courier, status, value } = req.body;
    await collection.updateOne(
      { _id: new ObjectId(id as string) },
      { $set: { suiteId, title, tracking, courier, status, value } }
    );
    return res.status(200).json({ message: "Package updated" });
  }

  if (req.method === "DELETE") {
    await collection.deleteOne({ _id: new ObjectId(id as string) });
    return res.status(200).json({ message: "Package deleted" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
