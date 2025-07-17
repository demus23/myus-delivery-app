import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Decode token and expect it to have email and role
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string; role?: string };

    // Check for admin role or admin email
    if (decoded.role !== 'admin' && decoded.email !== 'admin@myus.com') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const client = await clientPromise;
    const db = client.db('gulfship');
    const packages = await db.collection('packages').find().toArray();

    return res.status(200).json(packages);
  } catch (error) {
    console.error('Admin fetch error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

