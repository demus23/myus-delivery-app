// pages/api/mypackages/forward.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await dbConnect();

  if (req.method === 'POST') {
    // Add your forwarding logic here.
    // For example, get packageId from req.body, update the status, etc.
    // This is just a stub:
    return res.status(501).json({ message: 'Forward package not implemented' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
