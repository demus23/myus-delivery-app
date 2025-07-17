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
    res.status(200).json(user);
  } 
  else if (req.method === "PUT") {
    const { name, email, role, status } = req.body;
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { name, email, role, status },
      { new: true }
    ).select("-password").lean();
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.status(200).json(updatedUser);
  } 
  else if (req.method === "DELETE") {
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.status(204).end();
  } 
  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
