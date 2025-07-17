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

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden: Admins only' });

    const client = await clientPromise;
    const db = client.db('gulfship');
    const users = await db.collection('users').find().project({
      password: 0 // never send passwords
    }).toArray();

    res.status(200).json(users);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
