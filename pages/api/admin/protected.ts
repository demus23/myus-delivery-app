import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb'; // adjust path if needed
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 1. Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify JWT and check role
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    // 3. Connect to MongoDB and get all packages
    const client = await clientPromise;
    const db = client.db('gulfship'); // Use your actual DB name
    const packages = await db
  .collection('packages')
  .find({}, { projection: { _id: 1, title: 1, status: 1, createdAt: 1, tracking: 1, courier: 1, value: 1 } })
  .limit(50)
  .toArray();



    return res.status(200).json(packages);
  } catch (error) {
    console.error('Admin packages error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}
