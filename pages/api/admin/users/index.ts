// pages/api/admin/users/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";
import bcrypt from "bcryptjs";
import type { IUser } from "@/lib/models/User";

type SortPair = { key: string; dir: 1 | -1 };

function parseSortChain(s?: string): Record<string, 1 | -1> {
  if (!s) return { createdAt: -1 };
  const out: Record<string, 1 | -1> = {};
  s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const [k, d] = p.split(":");
      out[k] = d?.toLowerCase() === "asc" ? 1 : -1;
    });
  return Object.keys(out).length ? out : { createdAt: -1 };
}

function buildFilter(qs: NextApiRequest["query"]) {
  const filter: any = {};
  const { search, role, membership, verified } = qs;

  // text search
  const q = Array.isArray(search) ? search[0] : search;
  if (q && String(q).trim()) {
    const rx = new RegExp(String(q).trim(), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { suiteId: rx }];
  }

  // exacts
  const r = Array.isArray(role) ? role[0] : role;
  if (r) filter.role = r;

  const m = Array.isArray(membership) ? membership[0] : membership;
  if (m) filter.membership = m;

  const v = Array.isArray(verified) ? verified[0] : verified;
  if (v === "true") filter.emailVerified = true;
  if (v === "false") filter.emailVerified = false;

  return filter;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  const role = (session?.user as any)?.role;

  if (!session || (role !== "admin" && role !== "superadmin")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  try {
    if (req.method === "GET") {
      const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
      const limitRaw = parseInt(String(req.query.limit ?? "10"), 10) || 10;
      const limit = Math.min(Math.max(1, limitRaw), 100);
      const sort = parseSortChain(
        Array.isArray(req.query.sort) ? req.query.sort[0] : (req.query.sort as string)
      );
      const filter = buildFilter(req.query);

      const [data, total] = await Promise.all([
        UserModel.find(filter, "-password")
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean<IUser[]>()
          .exec(),
        UserModel.countDocuments(filter),
      ]);

      const normalized = data.map((u) => ({
        id: String(u._id),
        name: u.name ?? "",
        email: u.email ?? "",
        role: u.role ?? "user",
        phone: u.phone ?? "",
        membership: u.membership ?? "Free",
        subscribed: !!u.subscribed,
        suiteId: u.suiteId == null ? "" : String(u.suiteId),
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));

      return res.status(200).json({
        data: normalized,
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        sort,
      });
    }

    if (req.method === "POST") {
      const {
        name,
        email,
        role: newUserRole = "user",
        status = "Active", // logged only (not in schema unless you add it)
        password,
        suiteId,
        phone = "",
        membership = "Free",
        subscribed = false,
        addresses = [],
      } = req.body || {};

      if (!email) return res.status(400).json({ error: "Email is required" });
      if (!name) return res.status(400).json({ error: "Name is required" });

      const exists = await UserModel.findOne({ email }).lean();
      if (exists) return res.status(409).json({ error: "Email already exists" });

      const plain =
        typeof password === "string" && password.length >= 6
          ? password
          : generateTempPassword();
      const hash = await bcrypt.hash(plain, 10);

      const finalSuite =
        typeof suiteId === "string" && suiteId.trim()
          ? suiteId.trim()
          : await generateUniqueSuiteId();
                // Only superadmins can set elevated roles at creation time
           const requesterRole = (session?.user as any)?.role;
           const finalRole =
       requesterRole === "superadmin" ? newUserRole : "user";


      const created = await UserModel.create({
        name,
        email,
        password: hash,
        role: newUserRole,
        phone,
        membership,
        subscribed,
        suiteId: finalSuite,
        addresses: Array.isArray(addresses) ? addresses : [],
        paymentMethods: [],
        documents: [],
      });

      // Activity log (non-blocking)
      try {
        await ActivityLog.create({
          action: "add_user",
          entity: "user",
          entityId: String(created._id),
          performedBy: (session?.user as any)?.email,
          details: { name, email, role: newUserRole, status, suiteId: finalSuite },
        });
      } catch {
        /* ignore log errors */
      }

      const safeUser = await UserModel.findById(created._id, "-password")
        .lean<IUser>()
        .exec();

      return res.status(201).json({
        data: [
          {
            id: String(safeUser?._id),
            name: safeUser?.name,
            email: safeUser?.email,
            role: safeUser?.role,
            phone: safeUser?.phone ?? "",
            membership: safeUser?.membership ?? "Free",
            subscribed: !!safeUser?.subscribed,
            suiteId: safeUser?.suiteId ?? "",
            emailVerified: !!safeUser?.emailVerified,
            createdAt: safeUser?.createdAt,
            updatedAt: safeUser?.updatedAt,
          },
        ],
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}

/* ---------- helpers ---------- */

function generateTempPassword(): string {
  const upp = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const low = "abcdefghijkmnopqrstuvwxyz";
  const num = "1234567890";
  const sym = "#$%&*@!";
  const all = upp + low + num + sym;

  let out =
    upp[Math.floor(Math.random() * upp.length)] +
    low[Math.floor(Math.random() * low.length)] +
    num[Math.floor(Math.random() * num.length)] +
    sym[Math.floor(Math.random() * sym.length)];

  while (out.length < 12) out += all[Math.floor(Math.random() * all.length)];
  return out;
}

async function generateUniqueSuiteId(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const n = Math.floor(10000 + Math.random() * 90000);
    const candidate = `UAE-${n}`;
    const taken = await UserModel.findOne({ suiteId: candidate }).lean();
    if (!taken) return candidate;
    // loop to try a new candidate
  }
  return `UAE-${Date.now().toString().slice(-5)}`;
}
