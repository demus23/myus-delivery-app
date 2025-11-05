// pages/api/admin/users/[id]/addresses.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";
import { errorMessage } from "@/utils/errors";

type Address = {
  label: string;
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
};
type ApiRes = { ok: true; addresses: Address[] } | { ok: false; error: string };

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiRes>) {
  try {
    const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
    if (!session || !isAdmin(session)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    await dbConnect();

    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!id || typeof id !== "string") return res.status(400).json({ ok: false, error: "Invalid id" });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    user.addresses ||= [];

    if (req.method === "GET") {
      return res.status(200).json({ ok: true, addresses: user.addresses as Address[] });
    }

    if (req.method === "POST") {
      let { label, address, city, country, postalCode } = req.body || {};
      if (typeof label !== "string" || typeof address !== "string" || !label.trim() || !address.trim()) {
        return res.status(400).json({ ok: false, error: "label and address are required" });
      }
      label = label.trim();
      address = address.trim();
      if (typeof city === "string") city = city.trim();
      if (typeof country === "string") country = country.trim();
      if (typeof postalCode === "string") postalCode = postalCode.trim();

      user.addresses.push({ label, address, city, country, postalCode } as any);
      await user.save();

      try {
        await ActivityLog.create({
          action: "address_add",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: (session?.user as any)?.email,
          details: { label, city, country },
        });
      } catch {}

      return res.status(201).json({ ok: true, addresses: user.addresses as Address[] });
    }

    if (req.method === "PUT") {
      const { index } = req.body || {};
      const idx = typeof index === "string" ? parseInt(index, 10) : index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= user.addresses.length) {
        return res.status(400).json({ ok: false, error: "Invalid index" });
      }

      const cur: any = user.addresses[idx];
      const next: Address = {
        label: typeof req.body?.label === "string" ? req.body.label.trim() : cur.label,
        address: typeof req.body?.address === "string" ? req.body.address.trim() : cur.address,
        city: typeof req.body?.city === "string" ? req.body.city.trim() : cur.city,
        country: typeof req.body?.country === "string" ? req.body.country.trim() : cur.country,
        postalCode: typeof req.body?.postalCode === "string" ? req.body.postalCode.trim() : cur.postalCode,
      };

      user.addresses[idx] = next as any;
      user.markModified?.("addresses"); // ensure change detection on subdoc array
      await user.save();

      try {
        await ActivityLog.create({
          action: "address_update",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: (session?.user as any)?.email,
          details: { index: idx },
        });
      } catch {}

      return res.status(200).json({ ok: true, addresses: user.addresses as Address[] });
    }

    if (req.method === "DELETE") {
      const { index } = req.body || {};
      const idx = typeof index === "string" ? parseInt(index, 10) : index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= user.addresses.length) {
        return res.status(400).json({ ok: false, error: "Invalid index" });
      }

      const removed = (user.addresses as any[])[idx];
      user.addresses.splice(idx, 1);
      user.markModified?.("addresses");
      await user.save();

      try {
        await ActivityLog.create({
          action: "address_delete",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: (session?.user as any)?.email,
          details: { index: idx, removed },
        });
      } catch {}

      return res.status(200).json({ ok: true, addresses: user.addresses as Address[] });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ ok: false, error: `Method ${req.method} Not Allowed` });
  } catch (e: unknown) {
  console.error(e);
  return res.status(500).json({ ok: false, error: errorMessage(e) || "Server error" });
}
}
