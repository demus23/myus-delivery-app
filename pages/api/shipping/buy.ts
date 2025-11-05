import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import { Shipment } from "@/lib/models/Shipment";
import { buyLabel } from "@/lib/shipping/provider";
import { sendMail } from "@/lib/email/nodemailer";

type BuyBody = { shipmentId?: string; rateObjectId?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { shipmentId, rateObjectId } = (req.body || {}) as BuyBody;
  if (!shipmentId || !rateObjectId) {
    return res.status(400).json({ ok: false, error: "shipmentId and rateObjectId are required" });
  }

  await dbConnect();

  const doc = await Shipment.findById(shipmentId).lean();
  if (!doc) return res.status(404).json({ ok: false, error: "Shipment not found" });
  if (!doc.providerShipmentId) {
    return res.status(400).json({ ok: false, error: "Shipment has no providerShipmentId yet" });
  }

  // Idempotent return if already purchased
  if (doc.labelUrl && doc.trackingNumber) {
    return res.status(200).json({ ok: true, data: { labelUrl: doc.labelUrl, trackingNumber: doc.trackingNumber, shipmentId: String(doc._id) } });
  }

  const purchase = await buyLabel({ providerShipmentId: doc.providerShipmentId, rateObjectId });

  await Shipment.updateOne(
    { _id: doc._id },
    { $set: {
      status: "label_purchased",
      labelUrl: purchase.labelUrl,
      trackingNumber: purchase.trackingNumber,
      carrier: purchase.carrier,
      service: purchase.service,
      selectedRateId: purchase.rateObjectId || rateObjectId,
      updatedAt: new Date(),
    }}
  );

  // Best-effort email
  try {
    const toEmail = (doc as any).toEmail || (doc as any).customerEmail || process.env.SHIP_NOTIFY_TO;
    if (toEmail) {
      const html = `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
          <h2>Your shipment label is ready</h2>
          <p><b>Order:</b> ${doc.orderId || doc._id}</p>
          <p><b>Carrier:</b> ${purchase.carrier || "-"}</p>
          <p><b>Service:</b> ${purchase.service || "-"}</p>
          <p><b>Tracking:</b> ${purchase.trackingNumber}</p>
          <p><a href="${purchase.labelUrl}" target="_blank" rel="noreferrer">Download label</a></p>
        </div>
      `;
     await sendMail(toEmail, `Shipping label for ${doc.orderId || doc._id}`, html);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[buy email] error:", e);
  }

  return res.status(201).json({
    ok: true,
    data: { labelUrl: purchase.labelUrl, trackingNumber: purchase.trackingNumber, shipmentId: String(doc._id) },
  });
}
