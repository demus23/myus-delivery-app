// pages/api/admin/locations.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    { country: "UAE", address: "Suite 101, Dubai Mall", city: "Dubai", phone: "+971 1234 5678", flag: "🇦🇪" }
  ]);
}
