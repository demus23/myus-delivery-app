import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, description } = req.body;

  await dbConnect();

  const pkg = await PackageModel.create({
    user: session.user.id,
    title,
    description,
  });

  res.status(201).json({ package: pkg });
}
