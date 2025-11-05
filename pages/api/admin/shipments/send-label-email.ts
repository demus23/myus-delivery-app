import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import { sendMail } from "@/lib/email/nodemailer"; // assumes sendMail(to, subject, html)
import { errorMessage } from "@/utils/errors";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session?.user?.id || !["admin","superadmin"].includes(session.user?.role || "")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { shipmentId, toEmail } = req.body || {};
  if (!shipmentId) return res.status(400).json({ ok: false, error: "shipmentId required" });

  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return res.status(500).json({ ok: false, error: "DB not ready" });

  const filter = mongoose.isValidObjectId(String(shipmentId))
    ? { _id: new mongoose.Types.ObjectId(String(shipmentId)) }
    : { shipmentId: String(shipmentId) };

  const doc = await db.collection("shipments").findOne(filter);
  if (!doc) return res.status(404).json({ ok: false, error: "Shipment not found" });

  const recipient = String(toEmail || doc.customerEmail || doc.to?.email || "");
  if (!recipient) return res.status(400).json({ ok: false, error: "No recipient email on file" });

  const labelUrl = doc.labelUrl;
  const tracking = doc.trackingNumber || "-";
  const carrier = doc.carrier || "-";
  const service = doc.service || "-";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Your shipping label is ready</h2>
      <p><b>Tracking:</b> ${tracking}<br/>
         <b>Carrier:</b> ${carrier} · <b>Service:</b> ${service}</p>
      ${
        labelUrl
          ? `<p><a href="${labelUrl}" target="_blank" style="background:#111;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Download Label</a></p>`
          : `<p>No label URL stored for this shipment yet.</p>`
      }
      <p>If the button doesn't work, copy this URL into your browser:<br/>
      <a href="${labelUrl || "#"}">${labelUrl || "(none)"} </a></p>
    </div>
  `;

  try {
    await sendMail(recipient, `Your shipping label (Tracking ${tracking})`, html);
  } catch (e: unknown) {
  return res
    .status(500)
    .json({ ok: false, error: errorMessage(e) || "Failed to send email" });
}

return res.status(200).json({ ok: true });
}
