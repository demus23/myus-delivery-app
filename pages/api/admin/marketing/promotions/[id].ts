import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Promotion from "@/lib/models/Promotion";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PATCH") {
    const { status } = req.body;
    const promotion = await Promotion.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!promotion) return res.status(404).json({ error: "Promotion not found" });
    return res.status(200).json(promotion);
  }

  res.setHeader("Allow", ["PATCH"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
