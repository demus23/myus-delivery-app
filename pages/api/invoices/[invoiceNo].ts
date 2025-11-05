// pages/api/invoices/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import PDFDocument from "pdfkit";
import mongoose, { Types } from "mongoose";
import { verifyInvoiceToken } from "@/lib/tokens/signedUrl";

type InvoiceDoc = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  invoiceNo: string;
  amount: number;          // minor units
  currency: string;        // "AED"
  description?: string;
  status: "succeeded" | "pending" | "failed" | "refunded" | string;
  createdAt: Date;
  method?: { type?: string; brand?: string; last4?: string; label?: string };
  billingAddress?: { fullName?: string };
};

function amt(aMinor: number, c?: string) {
  const cur = (c || "AED").toUpperCase();
  return `${cur} ${(aMinor / 100).toFixed(2)}`;
}

function renderInvoiceHtml(inv: InvoiceDoc) {
  const when = new Date(inv.createdAt);
  const pdfHref = `/api/invoices/${encodeURIComponent(inv.invoiceNo)}?format=pdf`;

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${inv.invoiceNo}</title>
<style>
:root { --brand:#0ea5a2; --muted:#666; }
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:32px;color:#111}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.brand{color:var(--brand);font-weight:800;font-size:20px}
.muted{color:var(--muted)}
table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border-top:1px solid #eee;padding:10px 6px;text-align:left}
.right{text-align:right}
.total-row td{border-top:2px solid #ddd;font-weight:700}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;background:#e8f7f6;color:#0b3f3e;font-size:12px}
.actions{margin-top:20px;display:flex;gap:10px}
.btn{display:inline-block;padding:8px 12px;border:1px solid #ccd3d8;border-radius:6px;background:#f8fafb;color:#111;text-decoration:none;font-size:14px}
.btn:hover{background:#eef2f5}
@media print{ .no-print{ display:none } }
</style></head>
<body>
  <div class="hdr">
    <div>
      <div class="brand">CrossBorderCart</div>
      <div class="muted">Business Bay, Dubai, UAE</div>
    </div>
    <div style="text-align:right">
      <div><strong>Invoice</strong> ${inv.invoiceNo}</div>
      <div class="muted">${when.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}</div>
      <div class="badge">${inv.status}</div>
    </div>
  </div>

  <div><strong>Bill To:</strong> ${inv.billingAddress?.fullName || ""}</div>

  <table>
    <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
    <tbody>
      <tr><td>${inv.description || "Charge"}</td><td class="right">${amt(inv.amount, inv.currency)}</td></tr>
      <tr class="total-row"><td>Total</td><td class="right">${amt(inv.amount, inv.currency)}</td></tr>
    </tbody>
  </table>

  <p class="muted">Payment method: ${inv.method?.type ?? "—"}</p>

  <div class="no-print actions">
    <button class="btn" onclick="window.print()">Print</button>
    <a class="btn" href="${pdfHref}" target="_blank" rel="noreferrer">Open PDF</a>
  </div>
</body></html>`;
}

function streamPdf(res: NextApiResponse, inv: InvoiceDoc) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${inv.invoiceNo}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).fillColor("#0ea5a2").text("CrossBorderCart");
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor("#666").text("Business Bay, Dubai, UAE");
  doc.moveDown();

  doc.fillColor("#000").fontSize(14).text(`Invoice ${inv.invoiceNo}`, { align: "right" });
  doc.fontSize(10).fillColor("#666").text(inv.createdAt.toLocaleString(), { align: "right" });
  doc.moveDown();

  doc.fontSize(12).fillColor("#000").text(`Bill To: ${inv.billingAddress?.fullName || ""}`);
  doc.moveDown();

  doc.fontSize(12).text("Description", 50).text("Amount", 450);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke("#ddd");
  doc.moveDown(0.6);

  doc.text(inv.description || "Charge", 50);
  doc.text(amt(inv.amount, inv.currency), 450);
  doc.moveDown();

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke("#ddd");
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").text("Total", 50).text(amt(inv.amount, inv.currency), 450);
  doc.font("Helvetica");
  doc.end();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    await dbConnect();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    const invoiceNo = String(req.query.invoiceNo || "").trim();
    if (!invoiceNo) return res.status(400).json({ ok: false, error: "Missing invoiceNo" });

    // Access via signed token or session owner
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const tokenOk = token ? verifyInvoiceToken(token, invoiceNo) : false;

    let ownedUserId: string | undefined;
    if (!tokenOk) {
      const session = (await getServerSession(req, res, authOptions as any)) as any;
      ownedUserId = session?.user?.id || session?.user?._id;
      if (!ownedUserId) return res.status(401).json({ ok: false, error: "Unauthenticated" });
    }

    const match: any = { invoiceNo };
    if (!tokenOk && ownedUserId) match.user = new mongoose.Types.ObjectId(ownedUserId);

    const inv = await Payment.findOne(match).lean<InvoiceDoc>().exec();
    if (!inv) return res.status(404).json({ ok: false, error: "Invoice not found" });

    const fmt = String(req.query.format || "");
    if (fmt === "pdf") return streamPdf(res, inv);
    if (fmt === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(renderInvoiceHtml(inv));
    }

    return res.status(200).json({ ok: true, preview: inv });
 } catch (e: unknown) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string"
      ? (e as { message: string }).message
      : "Server error";

  console.error("invoice error:", e);
  return res.status(500).json({ ok: false, error: msg });
}

}
