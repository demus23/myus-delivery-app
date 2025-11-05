import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/lib/models/Invoice";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();
  if (req.method === "GET") {
    const invoices = await Invoice.find({}).populate("user", "name email").sort({ createdAt: -1 }).lean();
    return res.status(200).json(invoices);
  }
  if (req.method === "POST") {
    const { user, number, items, total, status, dueDate, notes } = req.body;
    if (!user || !number || !items || total === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const invoice = await Invoice.create({ user, number, items, total, status, dueDate, notes });
    return res.status(201).json(invoice);
  }
  return res.status(405).json({ error: "Method not allowed" });
   res.redirect(307, "/api/invoices/me");
}
