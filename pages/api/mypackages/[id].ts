import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  // GET: Get package details for logged-in user
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      const client = await clientPromise;
      const db = client.db('gulfship');

      const pkg = await db.collection('packages').findOne({
        _id: new ObjectId(id as string),
        $or: [{ userId: decoded.id }, { email: decoded.email }],
      });

      if (!pkg) return res.status(404).json({ message: 'Package not found' });
      res.status(200).json(pkg);
    } catch (err) {
      res.status(401).json({ message: 'Invalid token' });
    }
    return;
  }

  // POST: Add a message to this package
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role?: string };
      const { text } = req.body;
      if (!text) return res.status(400).json({ message: 'Text required' });

      const from = decoded.role === 'admin' ? 'admin' : 'user';
      const client = await clientPromise;
      const db = client.db('gulfship');

      const result = await db.collection('packages').updateOne(
        {
          _id: new ObjectId(id as string),
          ...(from === 'user' ? { $or: [{ userId: decoded.id }, { email: decoded.email }] } : {}),
        },
        {
          $push: {
            messages: {
              from,
              text,
              createdAt: new Date(),
            } as any, // <-- Fixes TS error
          }
        }
      );
      if (result.modifiedCount === 1) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({ message: 'Not found' });
      }
    } catch (err) {
      res.status(401).json({ message: 'Invalid token' });
    }
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
}
