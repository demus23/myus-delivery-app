// pages/api/admin/recent-shipments.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    "No shipments were processed in the past 30 days"
  ]);
}
