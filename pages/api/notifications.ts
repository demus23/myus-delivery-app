import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const now = Date.now();
  const notifications = [
    { id: "n1", title: "Welcome!", body: "Your account is ready.", createdAt: now - 1000 * 60 * 60, read: false },
    { id: "n2", title: "Shipment update", body: "Package XYZ is in transit.", createdAt: now - 1000 * 60 * 120, read: true },
  ];
  res.status(200).json({ notifications });
}
