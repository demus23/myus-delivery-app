// pages/api/admin/payments/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const role = (session?.user as any)?.role;
  if (!session || (role !== "admin" && role !== "superadmin")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  await dbConnect();
  const users = await User.find({}, "name email paymentMethods").lean();

  const methods = [];
  for (const u of users as any[]) {
    const list = u.paymentMethods || [];
    for (const m of list) {
      methods.push({
        id: m.id,
        type: m.type,
        details: m.details,
        isDefault: m.isDefault || false,
        userId: String(u._id),
        name: u.name,
        email: u.email,
        billingAddress: m.billingAddress || null,
      });
    }
  }

  return res.status(200).json({ methods });
}
