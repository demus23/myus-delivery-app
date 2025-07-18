import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  await dbConnect();

  if (req.method === "GET") {
    // If admin, return all. Else, only user's own.
    if (session?.user?.role === "admin") {
      const packages = await PackageModel.find({}).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ packages });
    } else if (session?.user?.id) {
      const packages = await PackageModel.find({ user: session.user.id }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ packages });
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
