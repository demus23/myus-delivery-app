import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
// Relative import to your NextAuth config:
// API route location => /pages/api/admin/users/...
// Going up to /pages/api/auth/[...nextauth]
import { authOptions } from "../pages/api/auth/[...nextauth]";


export async function requireAdmin(req: NextApiRequest, res: NextApiResponse) {
const session = await getServerSession(req, res, authOptions as any);
const role = (session as any)?.user?.role;
const isAllowed = role === "admin" || role === "superadmin";


if (!session || !isAllowed) {
res.status(403).json({ error: "Forbidden" });
return null;
}
return session;
}