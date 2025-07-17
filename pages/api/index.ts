import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await clientPromise;
  const db = client.db('gulfship');
  const collection = db.collection('packages');

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  let userId = null;

  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    userId = (decoded as any).id;
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (req.method === 'GET') {
    const data = await collection.find({ userId }).toArray();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { tracking, courier, value, status } = req.body;

    if (!tracking || !courier || !value) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const newPackage = {
      userId,
      tracking,
      courier,
      value,
      status: status || 'Pending',
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newPackage);
    return res.status(200).json({ ...newPackage, _id: result.insertedId });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
