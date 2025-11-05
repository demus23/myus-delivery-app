// pages/api/admin/charges/receipt/[invoiceNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { Payment } from "@/lib/models/Payment";
import { Activity } from "@/lib/models/Activity";
import { APP_ORIGIN } from "@/lib/stripe";
import { makeInvoiceToken } from "@/lib/tokens/signedUrl";
import { buildReceiptHtml } from "@/lib/invoices/receiptHtml";
import { sendMail } from "@/lib/email/nodemailer";

function fail(res: NextApiResponse, code: number, msg: string) {
  if (process.env.NODE_ENV !== "production") console.error("[receipt]", msg);
  return res.status(code).json({ ok: false, error: msg });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  const role = session?.user?.role;
  if (!session?.user?.id || !["admin", "superadmin"].includes(role)) {
    return fail(res, 403, "Forbidden");
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return fail(res, 405, `Method ${req.method} not allowed`);
  }

  const invoiceNo = String(req.query.invoiceNo || "");
  if (!invoiceNo) return fail(res, 400, "Missing invoiceNo");

  await dbConnect();
  const db = mongoose.connection.db!;
  const pay = await Payment.findOne({ invoiceNo }).lean();
  if (!pay) return fail(res, 404, "Invoice not found");

  const token = makeInvoiceToken(invoiceNo);
  const htmlUrl = `${APP_ORIGIN}/api/invoices/${encodeURIComponent(invoiceNo)}?format=html&token=${encodeURIComponent(
    token
  )}`;
  const pdfUrl = `${APP_ORIGIN}/api/invoices/${encodeURIComponent(invoiceNo)}?format=pdf&token=${encodeURIComponent(
    token
  )}`;

  // GET: just return a view URL (so your UI can “Open Receipt”)
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, url: htmlUrl, pdfUrl });
  }

  // POST: send the receipt email to the customer
  const userDoc = await db
    .collection<{ _id: mongoose.Types.ObjectId; email?: string; name?: string }>("users")
    .findOne({ _id: pay.user }, { projection: { email: 1, name: 1 } });

  if (!userDoc?.email) return fail(res, 409, "User has no email on file");

  // Render a pretty HTML receipt
  const html = buildReceiptHtml(
    {
      invoiceNo,
      amount: pay.amount,
      currency: pay.currency,
      description: pay.description,
      status: pay.status,
      // ✅ ensure string | Date (never undefined)
      createdAt: pay.createdAt ?? new Date(),
      method: pay.method as any,
      billingAddress: (pay as any).billingAddress,
    },
    APP_ORIGIN,
    token
  );

  await sendMail(
    userDoc.email,
    `Receipt ${invoiceNo}`,
    `${html}
     <p style="margin-top:16px">View online: <a href="${htmlUrl}">${htmlUrl}</a></p>
     <p>Download PDF: <a href="${pdfUrl}">${pdfUrl}</a></p>`
  );

  // Log activity
  await Activity.create({
    action: "receipt.sent",
    entity: "payment",
    entityId: invoiceNo,
    performedBy: new mongoose.Types.ObjectId(session.user.id),
    performedByEmail: session.user.email,
    details: { to: userDoc.email },
    ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "") as string,
    ua: req.headers["user-agent"] || "",
    createdAt: new Date(),
  });

  return res.status(200).json({ ok: true });
}
