// pages/api/admin/user-packages.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }
    const pkgs = await PackageModel.find({ user: userId }).lean();
    return res.status(200).json(pkgs);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
