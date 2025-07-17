// pages/api/mypackages.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import PackageModel from "@/lib/models/Package";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return res.status(401).json({ packages: [] });
  }

  await dbConnect();

  const rawPackages = await PackageModel.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const packages = rawPackages.map((pkg: any) => ({
    _id: pkg._id.toString(),
    title: pkg.title || "",
    description: pkg.description || "",
    createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : "",
  }));

  return res.status(200).json({ packages });
}
