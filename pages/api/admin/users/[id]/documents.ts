// pages/api/admin/users/[id]/documents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";
import formidable from "formidable";
import path from "path";
import { promises as fsp } from "fs";

type Doc = {
  label: string;
  filename: string;
  url?: string;
  uploadedAt?: Date;
};

// Minimal local type to avoid DOM File / Formidable type clashes
type UploadedFile = {
  filepath?: string;         // formidable v2/v3
  path?: string;             // formidable v1
  originalFilename?: string; // original client filename
  newFilename?: string;      // generated tmp name (formidable)
  mimetype?: string;         // "image/png", "application/pdf", ...
  size?: number;
};

const isAdmin = (s: any) => s?.user?.role === "admin" || s?.user?.role === "superadmin";

// Disable Next.js body parser so formidable can read the stream
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid user id" });

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.documents ||= [];

  switch (req.method) {
    case "GET": {
      return res.status(200).json({ documents: user.documents });
    }

    case "POST": {
      const ct = req.headers["content-type"] || "";
      const isMultipart = ct.toLowerCase().includes("multipart/form-data");

      if (isMultipart) {
        try {
          const result = await parseMultipart(req);
          const file = result.file as UploadedFile;
          let label = (Array.isArray(result.fields.label) ? result.fields.label[0] : result.fields.label) as
            | string
            | undefined;
          label = label?.trim();

          // Basic type allowlist (extend as needed)
          const okTypes = [
            /^image\//,
            /^application\/pdf$/,
            /^text\/plain$/,
            /^application\/msword$/,
            /^application\/vnd\.openxmlformats-officedocument\./,
          ];
          const mime = String(file.mimetype || "");
          if (!okTypes.some((rx) => rx.test(mime))) {
            return res.status(415).json({ error: "Unsupported file type" });
          }

          // Ensure destination dir exists: public/uploads/users/:id
          const destDir = path.join(process.cwd(), "public", "uploads", "users", id);
          await fsp.mkdir(destDir, { recursive: true });

          const original = String(file.originalFilename || file.newFilename || "file");
          const stored = makeStoredName(original);
          const src = String((file as any).filepath || (file as any).path || "");
          if (!src) throw new Error("Temporary upload file not found");
          const dst = path.join(destDir, stored);

          await fsp.rename(src, dst);

          const url = `/uploads/users/${id}/${stored}`;
          if (!label) label = baseNameNoExt(original);

          const newDoc: Doc = { label, filename: stored, url, uploadedAt: new Date() };
          user.documents.push(newDoc as any);
          await user.save();

          // Log (non-blocking)
          try {
            await ActivityLog.create({
              action: "document_add",
              entity: "user",
              entityId: user._id.toString(),
              performedBy: (session?.user as any)?.email,
              details: { label, filename: stored, url },
            });
          } catch {}

          return res.status(201).json({ documents: user.documents });
       } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Upload failed";

  return res.status(400).json({ error: msg });
}

      }

      // Fallback: JSON metadata mode (no binary upload)
      let { label, filename, url } = (req as any).body ?? {};
      if (typeof label !== "string" || !label.trim() || typeof filename !== "string" || !filename.trim()) {
        return res.status(400).json({ error: "label and filename are required" });
      }
      label = label.trim();
      filename = filename.trim();
      if (typeof url === "string") url = url.trim();

      user.documents.push({ label, filename, url, uploadedAt: new Date() } as any);
      await user.save();

      try {
        await ActivityLog.create({
          action: "document_add",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: (session?.user as any)?.email,
          details: { label, filename, url },
        });
      } catch {}

      return res.status(201).json({ documents: user.documents });
    }

    case "DELETE": {
      const { id: docId, filename } = (await readJsonBody(req)) ?? {};
      if (!docId && !filename) {
        return res.status(400).json({ error: "Provide id or filename to delete" });
      }

      const idx = user.documents.findIndex((d: any) => {
        if (docId && String(d._id) === String(docId)) return true;
        if (filename && String(d.filename) === String(filename)) return true;
        return false;
      });
      if (idx === -1) return res.status(404).json({ error: "Document not found" });

      const removed = user.documents.splice(idx, 1)[0];
      await user.save();

      // Best-effort: delete physical file if it's in /public/uploads/users/:id
      if (removed?.filename) {
        const p = path.join(process.cwd(), "public", "uploads", "users", id, removed.filename);
        try {
          await fsp.unlink(p);
        } catch {} // ignore
      }

      try {
        await ActivityLog.create({
          action: "document_delete",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: (session?.user as any)?.email,
          details: { removedId: removed?._id, filename: removed?.filename },
        });
      } catch {}

      return res.status(200).json({ documents: user.documents });
    }

    default: {
      res.setHeader("Allow", ["GET", "POST", "DELETE"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  }
}

/* ---------------- helpers ---------------- */

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
function baseNameNoExt(name: string) {
  const b = path.basename(name);
  const i = b.lastIndexOf(".");
  return i === -1 ? b : b.slice(0, i);
}
function makeStoredName(original: string) {
  const safe = sanitizeFilename(original);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "");
  const i = safe.lastIndexOf(".");
  if (i === -1) return `${stamp}_${safe}`;
  return `${stamp}_${safe.slice(0, i)}${safe.slice(i)}`;
}

async function parseMultipart(
  req: NextApiRequest
): Promise<{ fields: Record<string, any>; file: UploadedFile }> {
  const form = formidable({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  return new Promise((resolve, reject) => {
    form.parse(
      req,
      (err: unknown, fields: Record<string, any>, files: Record<string, any>) => {
        if (err) return reject(err);
        const first =
          (Array.isArray(files.file) ? files.file[0] : files.file) ??
          (Array.isArray(files.upload) ? files.upload[0] : files.upload) ??
          (Object.values(files)[0] as any);
        if (!first) return reject(new Error("No file field found"));
        resolve({ fields, file: first as UploadedFile });
      }
    );
  });
}

// For DELETE JSON body (since bodyParser is disabled globally here)
async function readJsonBody(req: NextApiRequest) {
  if ((req.headers["content-type"] || "").includes("application/json")) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return null;
    }
  }
  return null;
}
