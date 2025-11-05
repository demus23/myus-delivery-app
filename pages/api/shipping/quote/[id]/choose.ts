import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/db";
import Quote from "@/lib/models/Quote";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ ok: false, error: "Method not allowed" });
  await dbConnect();

  const { id } = req.query;
  const { chosenIndex } = req.body || {};
  const quote = await Quote.findById(id);
  if (!quote) return res.status(404).json({ ok: false, error: "Quote not found" });

  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= quote.options.length) {
    return res.status(400).json({ ok: false, error: "Invalid chosenIndex" });
  }

  quote.chosenIndex = chosenIndex;
  await quote.save();
  return res.json({ ok: true });
}
