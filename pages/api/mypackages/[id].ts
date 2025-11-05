import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { Types } from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || !Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ error: "Invalid package ID" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await dbConnect();

  // GET package by id
  if (req.method === "GET") {
    const pkg = await PackageModel.findOne({ _id: id, user: session.user.id }).lean();
    if (!pkg) return res.status(404).json({ error: "Package not found" });
    return res.status(200).json(pkg);
  }

  // PUT package by id
  if (req.method === "PUT" || req.method === "PATCH") {
    const updates = req.body;
    const pkg = await PackageModel.findOneAndUpdate(
      { _id: id, user: session.user.id },
      updates,
      { new: true }
    ).lean();
    if (!pkg) return res.status(404).json({ error: "Not found or not editable" });
    return res.status(200).json(pkg);
  }

  // DELETE package by id
  if (req.method === "DELETE") {
    const pkg = await PackageModel.findOneAndDelete({ _id: id, user: session.user.id });
    if (!pkg) return res.status(404).json({ error: "Not found or not deletable" });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
