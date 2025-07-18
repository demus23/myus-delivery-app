// pages/api/admin/all-users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]'; // this path is correct for /pages/api/admin
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/lib/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await dbConnect();
  const users = await UserModel.find().select("-password").lean();
  res.status(200).json(users);
}
