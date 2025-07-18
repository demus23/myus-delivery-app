import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'GET') {
    const packages = await PackageModel.find({ user: session.user.id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(packages);
  }

  if (req.method === 'POST') {
    const { tracking, courier, value, status } = req.body;
    if (!tracking || !courier || !value) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const pkg = await PackageModel.create({
      user: session.user.id,
      tracking,
      courier,
      value,
      status: status || 'Pending',
      createdAt: new Date(),
    });
    return res.status(201).json(pkg);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
