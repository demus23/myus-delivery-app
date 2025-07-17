// pages/api/mypackages.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const client = await clientPromise;
    const db = client.db('gulfship');

    // Find packages where userId/email matches
    // Adjust field as per your data, here using userId
    const packages = await db
      .collection('packages')
      .find({ $or: [{ userId: decoded.id }, { email: decoded.email }] })
      .toArray();

    res.status(200).json(packages);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
