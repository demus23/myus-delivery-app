// pages/api/user/addresses.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";

type Address = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};

type Ok = { addresses: Address[] };
type Err = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const user = await UserModel.findById(session.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.addresses ||= [];

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ addresses: user.addresses as any });
  }

  if (req.method === "POST") {
    const { label, address, city, country, postalCode } = req.body || {};
    if (typeof label !== "string" || !label.trim() || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "label and address are required" });
    }
    user.addresses.push({
      label: label.trim(),
      address: address.trim(),
      city: typeof city === "string" ? city.trim() : undefined,
      country: typeof country === "string" ? country.trim() : undefined,
      postalCode: typeof postalCode === "string" ? postalCode.trim() : undefined,
    } as any);
    await user.save();

    try {
      await ActivityLog.create({
        action: "user_add_address",
        entity: "user",
        entityId: user._id.toString(),
        performedBy: session.user?.email,
        details: { label, address, city, country, postalCode },
      });
    } catch {}

    return res.status(201).json({ addresses: user.addresses as any });
  }

  if (req.method === "PUT") {
    const { index, label, address, city, country, postalCode } = req.body || {};
    const idx = Number.isInteger(+index) ? +index : NaN;
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: "Invalid index" });
    }
    if (!user.addresses?.[idx]) {
      return res.status(404).json({ error: "Address not found" });
    }
    const cur: any = user.addresses[idx];
    user.addresses[idx] = {
      label: typeof label === "string" ? label.trim() : cur.label,
      address: typeof address === "string" ? address.trim() : cur.address,
      city: typeof city === "string" ? city.trim() : cur.city,
      country: typeof country === "string" ? country.trim() : cur.country,
      postalCode: typeof postalCode === "string" ? postalCode.trim() : cur.postalCode,
    } as any;
    await user.save();

    try {
      await ActivityLog.create({
        action: "user_update_address",
        entity: "user",
        entityId: user._id.toString(),
        performedBy: session.user?.email,
        details: { index: idx, after: user.addresses[idx] },
      });
    } catch {}

    return res.status(200).json({ addresses: user.addresses as any });
  }

  if (req.method === "DELETE") {
    const { index } = req.body || {};
    const idx = Number.isInteger(+index) ? +index : NaN;
    if (!Number.isInteger(idx) || idx < 0) {
      return res.status(400).json({ error: "Invalid index" });
    }
    if (!user.addresses?.[idx]) {
      return res.status(404).json({ error: "Address not found" });
    }
    const removed = (user.addresses as any[]).splice(idx, 1)[0];
    await user.save();

    try {
      await ActivityLog.create({
        action: "user_delete_address",
        entity: "user",
        entityId: user._id.toString(),
        performedBy: session.user?.email,
        details: { index: idx, removed },
      });
    } catch {}

    return res.status(200).json({ addresses: user.addresses as any });
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
