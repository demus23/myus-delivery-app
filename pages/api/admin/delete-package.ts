import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden: Admins only' });

    const { packageId, packageIds } = req.body;
    const client = await clientPromise;
    const db = client.db('gulfship');

    if (packageIds && Array.isArray(packageIds)) {
      await db.collection('packages').deleteMany({
        _id: { $in: packageIds.map((id: string) => new ObjectId(id)) }
      });
    } else if (packageId) {
      await db.collection('packages').deleteOne({ _id: new ObjectId(packageId) });
    } else {
      return res.status(400).json({ message: "No packageId(s) provided" });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

    