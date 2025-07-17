import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/lib/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admins only' });

    const { userId, newRole } = req.body;
    await dbConnect();
    await UserModel.updateOne({ _id: userId }, { $set: { role: newRole } });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
