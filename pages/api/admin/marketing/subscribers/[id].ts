import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Subscriber from "@/lib/models/Subscriber";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PATCH") {
    const subscriber = await Subscriber.findByIdAndUpdate(
      id,
      { status: "Unsubscribed" },
      { new: true }
    );
    if (!subscriber) return res.status(404).json({ error: "Subscriber not found" });
    return res.status(200).json(subscriber);
  }

  res.setHeader("Allow", ["PATCH"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
