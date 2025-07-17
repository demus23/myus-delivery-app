// pages/api/admin/packages/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb"; // make sure this exists and works

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db("gulfship");
  const collection = db.collection("packages");

  if (req.method === "GET") {
    const pkgs = await collection.find().sort({ createdAt: -1 }).toArray();
    const result = pkgs.map(p => ({
      ...p,
      _id: p._id.toString(),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
    }));
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const { suiteId, title, tracking, courier, status, value } = req.body;
    const newPkg = {
      suiteId,
      title,
      tracking,
      courier,
      status,
      value,
      createdAt: new Date().toISOString(),
    };
    const insertResult = await collection.insertOne(newPkg);
    return res.status(201).json({
      ...newPkg,
      _id: insertResult.insertedId.toString(),
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
