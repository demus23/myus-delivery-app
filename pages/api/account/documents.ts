// pages/api/account/documents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";
import formidable from "formidable";
import path from "path";
import { promises as fsp } from "fs";

type UploadedFile = {
  filepath?: string;
  path?: string;
  originalFilename?: string;
  newFilename?: string;
  mimetype?: string;
  size?: number;
};

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const user = await User.findById(session.user.id);
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
          const { fields, file } = await parseMultipart(req);
          const f = file as UploadedFile;
          let label = (Array.isArray(fields.label) ? fields.label[0] : fields.label) as string | undefined;
          label = label?.trim();

          const okTypes = [
            /^image\//,
            /^application\/pdf$/,
            /^text\/plain$/,
            /^application\/msword$/,
            /^application\/vnd\.openxmlformats-officedocument\./,
          ];
          const mime = String(f.mimetype || "");
          if (!okTypes.some((rx) => rx.test(mime))) {
            return res.status(415).json({ error: "Unsupported file type" });
          }

          const destDir = path.join(process.cwd(), "public", "uploads", "users", String(user._id));
          await fsp.mkdir(destDir, { recursive: true });

          const original = String(f.originalFilename || f.newFilename || "file");
          const stored = makeStoredName(original);
          const src = String((f as any).filepath || (f as any).path || "");
          if (!src) throw new Error("Temporary upload file not found");
          const dst = path.join(destDir, stored);

          await safeMove(src, dst);

          const url = `/uploads/users/${user._id}/${stored}`;
          if (!label) label = baseNameNoExt(original);

          user.documents.push({ label, filename: stored, url, uploadedAt: new Date() } as any);
          await user.save();

          try {
            await ActivityLog.create({
              action: "document_add",
              entity: "user",
              entityId: user._id.toString(),
              performedBy: session.user?.email,
              details: { label, filename: stored, url, self: true },
            });
          } catch {}

          return res.status(201).json({ documents: user.documents });
       } catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "string"
      ? e
      : "Upload failed";

  return res.status(400).json({ error: msg });
}
      }

      // JSON fallback (since bodyParser disabled, parse manually)
      const meta = await readJsonBody(req);
      let { label, filename, url } = meta || {};
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
          performedBy: session.user?.email,
          details: { label, filename, url, self: true },
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

      if (removed?.filename) {
        const p = path.join(process.cwd(), "public", "uploads", "users", String(user._id), removed.filename);
        try { await fsp.unlink(p); } catch {}
      }

      try {
        await ActivityLog.create({
          action: "document_delete",
          entity: "user",
          entityId: user._id.toString(),
          performedBy: session.user?.email,
          details: { removedId: removed?._id, filename: removed?.filename, self: true },
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

/* helpers */
function sanitizeFilename(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, "_"); }
function baseNameNoExt(name: string) {
  const b = path.basename(name); const i = b.lastIndexOf("."); return i === -1 ? b : b.slice(0, i);
}
function makeStoredName(original: string) {
  const safe = sanitizeFilename(original);
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "");
  const i = safe.lastIndexOf("."); return i === -1 ? `${stamp}_${safe}` : `${stamp}_${safe.slice(0, i)}${safe.slice(i)}`;
}
async function parseMultipart(req: NextApiRequest): Promise<{ fields: Record<string, any>; file: UploadedFile }> {
  const form = formidable({ multiples: false, maxFileSize: 10 * 1024 * 1024 });
  return new Promise((resolve, reject) => {
    form.parse(req, (err: unknown, fields: Record<string, any>, files: Record<string, any>) => {
      if (err) return reject(err);
      const first =
        (Array.isArray(files.file) ? files.file[0] : files.file) ??
        (Array.isArray(files.upload) ? files.upload[0] : files.upload) ??
        (Object.values(files)[0] as any);
      if (!first) return reject(new Error("No file field found"));
      resolve({ fields, file: first as UploadedFile });
    });
  });
}
async function readJsonBody(req: NextApiRequest) {
  if ((req.headers["content-type"] || "").includes("application/json")) {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(chunk as Buffer);
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
  }
  return null;
}
async function safeMove(src: string, dst: string) {
  try { await fsp.rename(src, dst); }
  catch (err: any) { if (err?.code === "EXDEV") { await fsp.copyFile(src, dst); await fsp.unlink(src); } else throw err; }
}
