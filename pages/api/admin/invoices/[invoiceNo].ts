import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import UserModel from "@/lib/models/User";

type IUserLean = { _id: any; name?: string | null; email?: string | null };
type IPaymentLean = {
  _id: any;
  invoiceNo: string;
  amount: number;
  currency: string;
  description?: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  createdAt: Date | string;
  user: any;
  billingAddress?: {
    fullName?: string;
    line1?: string; line2?: string;
    city?: string; state?: string; postalCode?: string; country?: string;
  } | null;
  method?: { type: "card" | "paypal" | "wire"; brand?: string; last4?: string; label?: string } | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const session = await getServerSession(req, res, authOptions as any);
  const role = (session as any)?.user?.role;
  if (!session || !["admin", "superadmin"].includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await dbConnect();

  const invoiceNo = String(req.query.invoiceNo);
  const inv = await Payment.findOne({ invoiceNo }).lean<IPaymentLean | null>();
  if (!inv) return res.status(404).json({ error: "Invoice not found" });

  // ✅ fetch a SINGLE user (not .find which returns an array)
  const user = await UserModel.findById(inv.user).lean<IUserLean | null>();

  // ✅ use fullName from billingAddress, with fallbacks
  const billToName =
    user?.name ||
    inv.billingAddress?.fullName ||
    user?.email ||
    "Customer";

  // ... build your PDF using inv + billToName ...
  // const pdfBuffer = await renderInvoicePdf(inv, { billToName, user });

  // For example purposes only (remove when you have pdfBuffer):
  return res.status(200).json({
    ok: true,
    preview: {
      invoiceNo: inv.invoiceNo,
      amount: inv.amount,
      currency: inv.currency,
      billToName,
      status: inv.status,
    },
  });
}
