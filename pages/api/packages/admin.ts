import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });

  await dbConnect();

  if (req.method === "GET") {
    const packages = await PackageModel.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ packages });
  }

  if (req.method === "POST") {
    const { title, user, tracking, courier, value, status } = req.body;
    if (!title || !user) return res.status(400).json({ error: "Missing fields" });

    const pkg = await PackageModel.create({
      title,
      user,        // Should be user _id
      tracking,
      courier,
      value,
      status: status || "Pending",
      createdAt: new Date(),
      adminCreatedBy: session.user.email,
    });
    return res.status(201).json({ package: pkg });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
