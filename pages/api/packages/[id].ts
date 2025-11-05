//pages\api\packages\[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import PackageModel from '@/lib/models/Package';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Types } from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  const { id } = req.query;
  if (!id || !Types.ObjectId.isValid(id as string))
    return res.status(400).json({ error: "Invalid package ID" });

  await dbConnect();
  const pkg = await PackageModel.findById(id);

  if (!pkg) return res.status(404).json({ error: "Package not found" });

  // Only admin or the owner can GET, UPDATE, DELETE
  const isOwner = pkg.user?.toString() === session?.user?.id;
  const isAdmin = session?.user?.role === "admin";

  if (req.method === "GET") {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });
    return res.status(200).json({ package: pkg });
  }

  if (req.method === "PATCH") {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });
    // Only allow editing "Pending" if user, or any if admin
    if (!isAdmin && pkg.status !== "Pending")
      return res.status(400).json({ error: "You can only edit Pending packages" });

    const { title, tracking, courier, value, status } = req.body;
    if (title) pkg.title = title;
    if (tracking) pkg.tracking = tracking;
    if (courier) pkg.courier = courier;
    if (value) pkg.value = value;
    if (isAdmin && status) pkg.status = status; // Only admin can change status directly

    await pkg.save();
    return res.status(200).json({ message: "Package updated", package: pkg });
  }

  if (req.method === "DELETE") {
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });
    // Only allow deleting "Pending" if user, or any if admin
    if (!isAdmin && pkg.status !== "Pending")
      return res.status(400).json({ error: "You can only delete Pending packages" });

    await pkg.deleteOne();
    return res.status(200).json({ message: "Package deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
