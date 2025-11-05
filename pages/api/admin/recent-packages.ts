// pages/api/admin/recent-packages.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    "No packages have arrived in your suite in the past 30 days"
  ]);
}
