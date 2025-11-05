// pages/api/admin/documents/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import fs from "fs";
import path from "path";

// Minimal session typing to satisfy TS (and your fields).
type AppSession = {
  user?: {
    id?: string;
    role?: string; // "admin" | "superadmin" | ...
    email?: string;
    name?: string;
  };
} | null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Explicitly type the session so TS doesn't treat it as `unknown`
  const session = (await getServerSession(req, res, authOptions)) as AppSession;

  // AuthZ: only admins allowed
  const role = session?.user?.role || "";
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ error: "id required" });

  // Helper: find user + document by subdoc _id or by filename
  const findDoc = async () => {
    const user: any = await User.findOne(
      { "documents": { $exists: true, $ne: [] } },
      { documents: 1, email: 1, name: 1 }
    );
    if (!user) return { user: null as any, doc: null as any, idx: -1 };

    const idx = (user.documents || []).findIndex(
      (d: any) =>
        String(d?._id || "") === String(id) ||
        String(d?.filename || "") === String(id)
    );
    const doc = idx >= 0 ? user.documents[idx] : null;
    return { user, doc, idx };
  };

  if (req.method === "GET") {
    const { user, doc } = await findDoc();
    if (!user || !doc) return res.status(404).json({ error: "Document not found" });
    return res.status(200).json({ document: doc, owner: { name: user.name, email: user.email } });
  }

  if (req.method === "PUT") {
    const { status } = req.body as { status?: "pending" | "approved" | "rejected" | string };
    if (!status) return res.status(400).json({ error: "status required" });

    const { user, doc, idx } = await findDoc();
    if (!user || !doc) return res.status(404).json({ error: "Document not found" });

    // Ensure doc has a status field even if older uploads didn't
    user.documents[idx].status = status;
    await user.save();

    return res.status(200).json({ ok: true, document: user.documents[idx] });
  }

  if (req.method === "DELETE") {
    const { user, doc, idx } = await findDoc();
    if (!user || !doc) return res.status(404).json({ error: "Document not found" });

    const filename = doc.filename;
    // Remove from array
    user.documents.splice(idx, 1);
    await user.save();

    // Best-effort remove file from disk
    if (filename) {
      try {
        fs.unlinkSync(path.join(process.cwd(), "public", "uploads", filename));
      } catch {
        // ignore fs errors
      }
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
