import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import { Payment } from "@/lib/models/Payment";
import mongoose from "mongoose";

async function ensureDb() {
  if (mongoose.connection.readyState === 0) {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const s = await getServerSession(req, res, authOptions as any);
  const userId = (s as any)?.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "Unauthorized" });

  await ensureDb();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10), 1), 100);

    const [items, total] = await Promise.all([
      Payment.find({ user: userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Payment.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({ ok: true, data: items, page, limit, total, pages: Math.ceil(total / limit) });
} catch (err: unknown) {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);

  console.error(err);
  return res
    .status(500)
    .json({ ok: false, error: msg || "Internal error"  });
}
 
  }

