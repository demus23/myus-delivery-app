import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb'; // or dbConnect + PackageModel if Mongoose
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admins only' });

    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    // Using native MongoDB
    const client = await clientPromise;
    const db = client.db('gulfship');
    const pkgs = await db.collection('packages')
      .find({ $or: [{ userId }, { user: userId }] })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(pkgs);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
