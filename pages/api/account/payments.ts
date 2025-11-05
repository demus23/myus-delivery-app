// pages/api/account/payments.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";

type PaymentMethod = { id: string; type: string; details: any; isDefault?: boolean };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Cast the session so TS lets us read user.id safely
  const session = (await getServerSession(req, res, authOptions as any)) as Session | null;
  const userId = (session?.user as any)?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  await dbConnect();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const pm: PaymentMethod[] = Array.isArray((user as any).paymentMethods)
    ? (user as any).paymentMethods
    : ((user as any).paymentMethods = []);

  switch (req.method) {
    case "GET": {
      return res.status(200).json({ methods: pm });
    }

    case "POST": {
      const { type, details, isDefault } = req.body ?? {};
      if (!type || details == null) return res.status(400).json({ error: "type and details are required" });

      const existing = new Set(pm.map((m) => String(m.id)));
      let id = randomId();
      while (existing.has(id)) id = randomId();

      pm.push({ id, type, details, isDefault: !!isDefault });
      if (isDefault) for (const m of pm) m.isDefault = m.id === id;

      (user as any).paymentMethods = pm;
      await user.save();
      return res.status(201).json({ methods: pm });
    }

    case "PUT": {
      const { id, details, type, makeDefault } = req.body ?? {};
      if (!id) return res.status(400).json({ error: "id is required" });

      const idx = pm.findIndex((m) => String(m.id) === String(id));
      if (idx === -1) return res.status(404).json({ error: "Payment method not found" });

      const cur = pm[idx];
      pm[idx] = {
        ...cur,
        type: type ?? cur.type,
        details: details ?? cur.details,
        isDefault: makeDefault ? true : cur.isDefault,
      };
      if (makeDefault) for (let i = 0; i < pm.length; i++) pm[i].isDefault = i === idx;

      (user as any).paymentMethods = pm;
      await user.save();
      return res.status(200).json({ methods: pm });
    }

    case "DELETE": {
      const { id } = req.body ?? {};
      if (!id) return res.status(400).json({ error: "id is required" });

      const idx = pm.findIndex((m) => String(m.id) === String(id));
      if (idx === -1) return res.status(404).json({ error: "Payment method not found" });

      const wasDefault = !!pm[idx]?.isDefault;
      pm.splice(idx, 1);
      if (wasDefault && pm.length) {
        pm[0].isDefault = true;
        for (let i = 1; i < pm.length; i++) pm[i].isDefault = false;
      }

      (user as any).paymentMethods = pm;
      await user.save();
      return res.status(200).json({ methods: pm });
    }

    default: {
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 12); // 10-char base36
}
