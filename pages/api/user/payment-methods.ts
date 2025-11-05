// pages/api/user/payment-methods.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import User from "../../../lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

// Normalize DB array -> UI shape
function toMethods(arr: any[] = []) {
  return arr.map((m: any) => ({
    id: String(m._id ?? m.id ?? ""),
    type: m.type,
    details: m.details,
    isDefault: !!m.isDefault,
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });
  const userId = session.user.id as string;

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.paymentMethods = user.paymentMethods || [];

  const respondOk = async () => {
    await user.save();
    const methods = toMethods(user.paymentMethods);
    return res.json({ methods, paymentMethods: user.paymentMethods });
  };

  // ...rest of your handler stays exactly as we sent last time


  if (req.method === "GET") {
    return respondOk();
  }

  if (req.method === "POST") {
    // Accept either { type, details } OR { type, tokenOrDetails, makeDefault }
    const { type } = req.body || {};
    const details = req.body?.details ?? req.body?.tokenOrDetails;
    const makeDefault: boolean = !!req.body?.makeDefault;

    if (!type || !details) {
      return res.status(400).json({ error: "Missing fields: type and details/tokenOrDetails required" });
    }

    // Add new
    user.paymentMethods.push({ type, details, isDefault: !!makeDefault });

    // Handle default flag (only one default)
    if (makeDefault) {
      const lastIdx = user.paymentMethods.length - 1;
      user.paymentMethods = user.paymentMethods.map((m: any, i: number) => ({
        ...(m.toObject?.() ?? m),
        isDefault: i === lastIdx,
      }));
    }

    return respondOk();
  }

  if (req.method === "PUT") {
    // Accept either { index, type, details } OR { id, type, details }
    const { index, id, type, details } = req.body || {};

    // Resolve target index
    let target = -1;
    if (typeof index === "number") target = index;
    if (target < 0 && id) {
      target = user.paymentMethods.findIndex((m: any) => String(m._id ?? m.id) === String(id));
    }
    if (target < 0 || !user.paymentMethods[target]) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Update fields if provided
    if (type) user.paymentMethods[target].type = type;
    if (details) user.paymentMethods[target].details = details;

    // Optional default toggle
    if (typeof req.body?.isDefault === "boolean") {
      const makeDefault = !!req.body.isDefault;
      user.paymentMethods = user.paymentMethods.map((m: any, i: number) => ({
        ...(m.toObject?.() ?? m),
        isDefault: makeDefault ? i === target : (m.isDefault && i === target ? false : m.isDefault),
      }));
    }

    return respondOk();
  }

  if (req.method === "DELETE") {
    // Accept either { index } OR { id }
    const { index, id } = req.body || {};

    let target = -1;
    if (typeof index === "number") target = index;
    if (target < 0 && id) {
      target = user.paymentMethods.findIndex((m: any) => String(m._id ?? m.id) === String(id));
    }

    if (target < 0 || !user.paymentMethods[target]) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    user.paymentMethods.splice(target, 1);
    return respondOk();
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
