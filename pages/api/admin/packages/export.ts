import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";

function normalizeStatus(input?: string) {
  if (!input) return "Pending";
  const v = String(input).trim().toLowerCase();
  const map: Record<string,string> = {
    pending:"Pending",received:"Received",processing:"Processing",shipped:"Shipped",
    delivered:"Delivered",cancelled:"Cancelled",canceled:"Cancelled",
    forwarded:"Forwarded","in transit":"In Transit",in_transit:"In Transit",transit:"In Transit",problem:"Problem"
  };
  return map[v] || "Pending";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!["admin","superadmin"].includes((session as any)?.user?.role || "")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await dbConnect();
  const db = mongoose.connection.db!;
  const { search = "", status = "", suite = "", email = "" } = req.query as Record<string,string>;

  const q: any = {};
  if (search) {
    const s = String(search).trim();
    q.$or = [
      { tracking: { $regex: s, $options: "i" } },
      { courier: { $regex: s, $options: "i" } },
      { userEmail: { $regex: s, $options: "i" } },
      { suiteId: { $regex: s, $options: "i" } },
      { status: { $regex: s, $options: "i" } },
      { title: { $regex: s, $options: "i" } },
    ];
  }
  if (status) q.status = new RegExp("^" + normalizeStatus(status) + "$", "i");
  if (suite)  q.suiteId = new RegExp(suite, "i");
  if (email)  q.userEmail = new RegExp(email, "i");

  const rows = await db.collection("packages").find(q).sort({ createdAt: -1 }).limit(5000).toArray();

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=packages_export.csv");

  const header = ["_id","title","tracking","courier","value","status","userEmail","suiteId","location","createdAt","updatedAt"].join(",");
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const body = rows.map(r => [
    r._id, r.title, r.tracking, r.courier, r.value, r.status, r.userEmail, r.suiteId,
    r.location, r.createdAt?.toISOString?.() ?? "", r.updatedAt?.toISOString?.() ?? ""
  ].map(esc).join(",")).join("\n");

  res.send(header + "\n" + body);
}
