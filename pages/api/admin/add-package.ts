import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; email: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden: Admins only' });

    const { title, description, status } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const client = await clientPromise;
    const db = client.db('gulfship');
    const now = new Date();

    const pkg = {
      title,
      description,
      status: status || 'Pending',
      createdAt: now,
      adminCreatedBy: decoded.email,
    };

    const result = await db.collection('packages').insertOne(pkg);
   (pkg as any)._id = result.insertedId;

    res.status(200).json({ ...pkg, _id: result.insertedId });

  } catch (error) {
    console.error('Add package error:', error);
    res.status(401).json({ message: 'Invalid token or add error' });
  }
}
