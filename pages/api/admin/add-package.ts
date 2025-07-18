import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    await dbConnect();
    const { title, tracking, courier, value, status, suiteId } = req.body;

    if (!title || !tracking || !courier || !value) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pkg = await PackageModel.create({
      title,
      tracking,
      courier,
      value,
      status: status || "Pending",
      suiteId: suiteId || "",
      createdAt: new Date(),
    });

    return res.status(201).json({ package: pkg });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
