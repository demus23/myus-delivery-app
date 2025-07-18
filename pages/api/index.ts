import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  // Only admins see all packages. Users only see theirs.
  if (req.method === "GET") {
    let packages;
    if (session.user.role === "admin") {
      packages = await PackageModel.find({}).lean();
    } else {
      packages = await PackageModel.find({ user: session.user.id }).lean();
    }
    return res.status(200).json(packages);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
