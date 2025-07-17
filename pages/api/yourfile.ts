import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is missing');
    return res.status(500).json({ message: 'Server error' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    return res.status(200).json({ message: 'Authorized', decoded });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
