import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    // ✅ USE NEXTAUTH_SECRET HERE:
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { id: string; role: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden: Admins only' });

    const { packageId, newStatus } = req.body;
    if (!packageId || !newStatus) return res.status(400).json({ message: 'Missing data' });

    const client = await clientPromise;
    const db = client.db('gulfship');
    await db.collection('packages').updateOne({ _id: packageId }, { $set: { status: newStatus } });

    res.status(200).json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(401).json({ message: 'Invalid token or update error' });
  }
}
