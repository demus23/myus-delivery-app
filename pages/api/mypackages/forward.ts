// pages/api/mypackages/forward.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const client = await clientPromise;
    const db = client.db("gulfship");
    // Get user's home address
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.id) },
      { projection: { address: 1 } }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const { packageId } = req.body;
    // Set forwarding request on package
    await db.collection("packages").updateOne(
      { _id: new ObjectId(packageId), userId: decoded.id },
      {
        $set: {
          forwardRequested: true,
          forwardStatus: "Requested",
          forwardAddress: user.address,
        }
      }
    );
    res.status(200).json({ message: "Forwarding requested" });
  } catch (e) {
    res.status(401).json({ message: "Invalid token" });
  }
}
