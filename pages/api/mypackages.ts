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

  const userPackages = await PackageModel.find({ user: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  // Return all relevant fields
  const packages = userPackages.map((pkg: any) => ({
    _id: pkg._id.toString(),
    tracking: pkg.tracking || "",
    courier: pkg.courier || "",
    value: pkg.value || "",
    status: pkg.status || "",
    title: pkg.title || "",
    recipient: pkg.recipient || "",
    description: pkg.description || "",
    suiteId: pkg.suiteId || "",
    address: pkg.address || "",
    createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : "",
  }));

  return res.status(200).json(packages);
}
