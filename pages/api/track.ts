import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tracking } = req.query;

  if (!tracking || typeof tracking !== 'string') {
    return res.status(400).json({ message: 'Tracking number required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('gulfship');
    const pkg = await db.collection('packages').findOne({ tracking });

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    return res.status(200).json({
      tracking: pkg.tracking,
      courier: pkg.courier,
      value: pkg.value,
      status: pkg.status,
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
