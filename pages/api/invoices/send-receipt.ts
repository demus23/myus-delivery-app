// pages/api/invoices/send-receipt.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import mongoose from "mongoose";
import type { Db } from "mongodb";
import { dbConnect } from "@/lib/mongoose";
import { sendMail } from "@/lib/email"; // <-- uses your util
import { renderInvoiceHTML } from "@/lib/invoices/html"; // <-- use your existing renderer if you have one

type Resp =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { invoiceNo, to, subject } = (req.body || {}) as {
    invoiceNo?: string;
    to?: string;
    subject?: string;
  };
  if (!invoiceNo) return res.status(400).json({ ok: false, error: "invoiceNo is required" });

  await dbConnect();
  const maybeDb = mongoose.connection.db;
  if (!maybeDb) return res.status(500).json({ ok: false, error: "Database not ready" });
  const db = maybeDb as unknown as Db;

  const invoice = await db.collection("invoices").findOne({ invoiceNo: String(invoiceNo) });
  if (!invoice) return res.status(404).json({ ok: false, error: "Invoice not found" });

  const html = renderInvoiceHTML(invoice);
  const recipient = to || invoice?.customer?.email || invoice?.user?.email;
  if (!recipient) return res.status(400).json({ ok: false, error: "Recipient email not found. Provide body.to" });

  const subj = subject || `Receipt • Invoice #${invoiceNo}`;

  try {
    await sendMail(recipient, subj, html);
    return res.status(200).json({ ok: true, message: "Receipt sent" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "Failed to send email" });
  }
}
