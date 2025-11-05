import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  await dbConnect();

  if (req.method === "GET") {
    const packages = await PackageModel.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ packages });
  }

  if (req.method === "POST") {
    try {
      const { title, user, tracking, courier, value, status, suiteId } = req.body ?? {};

      // Basic validation
      if (!title || !user) {
        return res.status(400).json({ error: "Missing fields: title, user are required." });
      }

      // Sanitize/normalize
      const payload: any = {
        title: String(title).trim(),
        user, // should be a valid ObjectId
        status: status || "Pending",
        adminCreatedBy: session.user.email,
      };

      if (tracking) payload.tracking = String(tracking).trim();
      if (courier) payload.courier = String(courier).trim();
      if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
        payload.value = Number(value);
      }

      // Only set suiteId if it's truthy and non-empty after trimming
      if (typeof suiteId !== "undefined" && suiteId !== null) {
        const s = String(suiteId).trim();
        if (s.length > 0) {
          payload.suiteId = s;
        }
        // else: leave it undefined → will not be indexed (sparse)
      }

      const pkg = await PackageModel.create({
        ...payload,
        createdAt: new Date(), // timestamps also set updatedAt automatically
      });

      return res.status(201).json({ package: pkg });
    } catch (err: any) {
      // Duplicate key handling (e.g., suiteId already exists)
      if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || "unique";
        const value = err.keyValue?.[field];
        return res.status(409).json({
          error: `Duplicate ${field}${value ? `: '${value}'` : ""}. Value must be unique.`,
          field,
          value,
        });
      }
      console.error("Create package failed:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
