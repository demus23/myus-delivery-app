import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import Subscriber from "@/lib/models/Subscriber";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "GET") {
    const subscribers = await Subscriber.find().sort({ joined: -1 });
    return res.status(200).json(subscribers);
  }

  if (req.method === "POST") {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const subscriber = await Subscriber.create({ email });
    return res.status(201).json(subscriber);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
