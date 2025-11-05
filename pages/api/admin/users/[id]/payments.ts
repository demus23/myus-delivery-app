import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import dbConnect from "@/lib/dbConnect";
import User from "@/lib/models/User";
import ActivityLog from "@/lib/models/ActivityLog";


// Match your schema enum
const ALLOWED_TYPES = new Set(["card", "paypal", "wire"]);

function isAdmin(session: any) {
  const r = session?.user?.role;
  return r === "admin" || r === "superadmin";
}

// Find by either our custom `id` or the Mongo subdoc `_id`
function findIndexByAnyId(list: any[], val: string) {
  return list.findIndex(
    (m: any) => String(m.id ?? "") === String(val) || String(m._id ?? "") === String(val)
  );
}

// Guarantee only one default at a time
function ensureSingleDefault(list: any[], preferIndex?: number) {
  if (typeof preferIndex === "number" && preferIndex >= 0 && preferIndex < list.length) {
    for (let i = 0; i < list.length; i++) list[i].isDefault = i === preferIndex;
    return;
  }
  let firstDefault = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].isDefault) {
      if (firstDefault === -1) firstDefault = i;
      else list[i].isDefault = false;
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions as any);
    if (!isAdmin(session)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbConnect();

    const { id } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid id" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Ensure array exists
    const pm: any[] = Array.isArray((user as any).paymentMethods)
      ? (user as any).paymentMethods
      : ((user as any).paymentMethods = []);

    switch (req.method) {
      case "GET": {
        return res.status(200).json({ methods: pm });
      }

      case "POST": {
        const { type, details, isDefault } = req.body ?? {};
        if (!type || details == null) {
          return res.status(400).json({ error: "type and details are required" });
        }
        if (!ALLOWED_TYPES.has(type)) {
          return res.status(400).json({ error: "Invalid type. Use card | paypal | wire" });
        }

        // Your schema expects a string; coerce JSON to string if needed
        const detailsStr = typeof details === "string" ? details : JSON.stringify(details);

        // Generate a user-local id (Mongo will also give a subdoc _id)
        const existing = new Set(pm.map((m: any) => String(m.id)));
        let methodId = randomId();
        while (existing.has(methodId)) methodId = randomId();

        pm.push({ id: methodId, type, details: detailsStr, isDefault: !!isDefault });

        if (isDefault) ensureSingleDefault(pm, pm.length - 1);

        (user as any).paymentMethods = pm;
       await user.save();

try {
  await ActivityLog.create({
    action: "payment_method_add",
    entity: "user",
    entityId: user._id.toString(),
    performedBy: (session as any)?.user?.email,
    details: {
      id: methodId,            // the client id we generated
      type,
      isDefault: !!isDefault,
    },
  });
} catch { /* logging should never block */ }

return res.status(201).json({ methods: pm });

      }

      case "PUT": {
        const { id: mid, details, type, makeDefault } = req.body ?? {};
        if (!mid) return res.status(400).json({ error: "id is required" });

        const idx = findIndexByAnyId(pm, String(mid));
        if (idx === -1) return res.status(404).json({ error: "Payment method not found" });

        if (typeof type !== "undefined" && !ALLOWED_TYPES.has(type)) {
          return res.status(400).json({ error: "Invalid type. Use card | paypal | wire" });
        }

        // Coerce details to string if provided
        const detailsStr =
          typeof details === "undefined"
            ? undefined
            : typeof details === "string"
            ? details
            : JSON.stringify(details);

        const cur = pm[idx];
        pm[idx] = {
          ...cur,
          type: typeof type !== "undefined" ? type : cur.type,
          details: typeof detailsStr !== "undefined" ? detailsStr : cur.details,
          isDefault: makeDefault ? true : cur.isDefault,
        };

        if (makeDefault) ensureSingleDefault(pm, idx);

        (user as any).paymentMethods = pm;
       await user.save();

try {
  await ActivityLog.create({
    action: "payment_method_update",
    entity: "user",
    entityId: user._id.toString(),
    performedBy: (session as any)?.user?.email,
    details: {
      id: pm[idx].id ?? pm[idx]._id,   // accept either id or _id
      makeDefault: !!makeDefault,
      typeChanged: typeof type !== "undefined",
      detailsChanged: typeof details !== "undefined",
    },
  });
} catch { /* non-blocking */ }

return res.status(200).json({ methods: pm });

      }

      case "DELETE": {
        const { id: mid } = req.body ?? {};
        if (!mid) return res.status(400).json({ error: "id is required" });

        const idx = findIndexByAnyId(pm, String(mid));
        if (idx === -1) return res.status(404).json({ error: "Payment method not found" });

        const wasDefault = !!pm[idx]?.isDefault;
        pm.splice(idx, 1);

        if (wasDefault && pm.length) {
          pm[0].isDefault = true;
          ensureSingleDefault(pm, 0);
        }

        (user as any).paymentMethods = pm;
       await user.save();

try {
  await ActivityLog.create({
    action: "payment_method_delete",
    entity: "user",
    entityId: user._id.toString(),
    performedBy: (session as any)?.user?.email,
    details: {
      id: mid,                 // whatever id the client sent (id or _id)
      wasDefault,
      remainingCount: pm.length,
    },
  });
} catch { /* non-blocking */ }

return res.status(200).json({ methods: pm });

      }

      default: {
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
      }
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
}

function randomId() {
  // 10-char base36
  return Math.random().toString(36).slice(2, 12);
}
