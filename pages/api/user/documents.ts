// pages/api/user/documents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import formidable from "formidable"; // default import only (no types from package)
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

type UploadedFile = {
  filepath?: string; // formidable v2/v3
  path?: string;     // formidable v1
  mimetype?: string;
  mime?: string;
  size?: number;
  originalFilename?: string;
  newFilename?: string;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const config = { api: { bodyParser: false } };

function ensureUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();
  const user: any = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "GET") {
    return res.status(200).json({ documents: user.documents || [] });
  }

  if (req.method === "POST") {
    ensureUploadDir();

    const form = formidable({
      multiples: false,
      keepExtensions: true,
      uploadDir: path.join(process.cwd(), "public", "uploads"),
      maxFileSize: MAX_FILE_BYTES,
    });

    form.parse(req, async (err: any, fields: Record<string, any>, files: Record<string, any>) => {
      try {
        if (err) {
          if (String(err?.message || "").toLowerCase().includes("max file size")) {
            return res.status(400).json({ error: "File too large (max 10MB)." });
          }
          return res.status(400).json({ error: "Upload parse error" });
        }

        const first =
          (Array.isArray(files.file) ? files.file[0] : files.file) ??
          (Array.isArray(files.upload) ? files.upload[0] : files.upload) ??
          (Object.values(files)[0] as any);

        if (!first) return res.status(400).json({ error: "Missing file" });

        const one = first as UploadedFile;
        const mimetype = one.mimetype || one.mime || "";
        if (!ALLOWED_MIME.has(mimetype)) {
          try {
            fs.unlinkSync((one.filepath as string) || (one.path as string));
          } catch {}
          return res.status(400).json({ error: "Invalid file type. Allowed: PDF, JPG, PNG, WEBP." });
        }

        const tmpPath = (one.filepath as string) || (one.path as string);
        if (!tmpPath) return res.status(400).json({ error: "Upload failed (temp file missing)" });

        const storedName = path.basename(tmpPath);
        const publicUrl = `/uploads/${storedName}`;
        const label = (Array.isArray(fields.label) ? fields.label[0] : fields.label) || "Document";

        user.documents = user.documents || [];
        user.documents.push({
          label,
          filename: storedName,
          url: publicUrl,
          uploadedAt: new Date(),
        });
        await user.save();

        const fresh = await User.findById(userId, "-password").lean();
        const docs = (fresh as any)?.documents || [];
        return res.status(201).json({ documents: docs });
     } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Upload failed";

  return res.status(500).json({ error: msg });
}

    });
    return;
  }

  if (req.method === "DELETE") {
    const { filename } = req.query;
    const name = Array.isArray(filename) ? filename[0] : filename;
    if (!name) return res.status(400).json({ error: "filename required" });

    user.documents = (user.documents || []).filter((d: any) => d.filename !== name);
    await user.save();

    try {
      fs.unlinkSync(path.join(process.cwd(), "public", "uploads", name));
    } catch { /* ignore */ }

    const fresh = await User.findById(userId, "-password").lean();
    const docs = (fresh as any)?.documents || [];
    return res.status(200).json({ documents: docs });
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
