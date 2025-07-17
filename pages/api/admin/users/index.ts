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

  if (req.method === "GET") {
    const users = await UserModel.find().select("-password").lean();
    res.status(200).json(users);
  } 
  else if (req.method === "POST") {
    const { name, email, role, status } = req.body;
    if (!name || !email || !role || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    // You may want to check if email already exists
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const newUser = await UserModel.create({ name, email, role, status });
    // Do not return password field!
    const userToReturn = newUser.toObject();
    delete userToReturn.password;
    res.status(201).json(userToReturn);
  } 
  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
