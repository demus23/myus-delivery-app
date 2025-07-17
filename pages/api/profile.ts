import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('gulfship');

    if (req.method === 'POST') {
      const { tracking, courier, value, status } = req.body;

      if (!tracking || !courier || !value || !status) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      const result = await db.collection('packages').insertOne({
        tracking,
        courier,
        value,
        status,
        userId: new ObjectId(decoded.id),
        createdAt: new Date(),
      });

      return res.status(201).json({ _id: result.insertedId, tracking, courier, value, status });
    }

    if (req.method === 'GET') {
      const packages = await db
        .collection('packages')
        .find({ userId: new ObjectId(decoded.id) })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(packages);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Packages API error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
