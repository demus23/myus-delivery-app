// pages/api/me.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const client = await clientPromise;
    const db = client.db('gulfship');

    if (req.method === 'GET') {
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(decoded.id) },
        { projection: { password: 0 } }
      );
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } else if (req.method === 'POST') {
      const { address } = req.body;
      await db.collection('users').updateOne(
        { _id: new ObjectId(decoded.id) },
        { $set: { address } }
      );
      return res.status(200).json({ message: 'Profile updated' });
    }
    res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
