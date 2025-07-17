import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const { packageId } = req.body;

    if (!packageId) return res.status(400).json({ message: 'No packageId provided' });

    const client = await clientPromise;
    const db = client.db('gulfship');
    // Only allow deleting your own "Pending" packages
    const result = await db.collection('packages').deleteOne({
      _id: new ObjectId(packageId),
      $or: [{ userId: decoded.id }, { email: decoded.email }],
      status: 'Pending'
    });

    if (result.deletedCount === 1) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ message: 'Not found or cannot delete (only Pending allowed)' });
    }
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
