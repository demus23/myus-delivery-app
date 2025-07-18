// pages/api/admin/users/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await dbConnect();

  const { id } = req.query;

  if (req.method === "GET") {
    const user = await UserModel.findById(id).select("-password").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  }

  if (req.method === "PUT") {
    const { name, email, role, status } = req.body;
    const updated = await UserModel.findByIdAndUpdate(
      id,
      { name, email, role, status },
      { new: true, runValidators: true }
    ).select("-password");
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const deleted = await UserModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: "User not found" });
    return res.status(200).json({ message: "User deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
