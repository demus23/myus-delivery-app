import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongoose";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse
) {
  const start = performance.now();
  await dbConnect();
  const latency = Math.round(performance.now() - start);

  res.status(200).json({
    dbConnected: mongoose.connection.readyState === 1,
    apiLatencyMs: latency,
    queueDepth: 0, // plug your real queue metric here
  });
}
