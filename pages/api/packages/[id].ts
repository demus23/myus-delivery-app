// pages/api/admin/packages/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };

    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    const packageId = req.query.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Missing status value' });
    }

    const client = await clientPromise;
    const db = client.db('gulfship');

    const result = await db.collection('packages').updateOne(
      { _id: new ObjectId(packageId) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Package not found' });
    }

    return res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error('Admin update package status error:', error);
    return res.status(401).json({ message: 'Invalid token or error' });
  }
}
