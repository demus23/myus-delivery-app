// pages/api/addpackage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

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
    const { tracking, courier, value } = req.body;

    if (!tracking || !courier || !value) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const client = await clientPromise;
    const db = client.db('gulfship');

    const result = await db.collection('packages').insertOne({
      tracking,
      courier,
      value,
      status: 'Pending',
      userId: decoded.id,
      email: decoded.email,
      createdAt: new Date(),
    });

    res.status(200).json({ success: true, id: result.insertedId });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
