import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import NotificationSetting from "@/lib/models/NotificationSetting";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  // GET all notification settings
  if (req.method === "GET") {
    const notifications = await NotificationSetting.find({});
    return res.status(200).json(notifications);
  }

  // PUT: update a single template
  if (req.method === "PUT") {
    const { id, enabled, subject, template } = req.body;
    const updated = await NotificationSetting.findByIdAndUpdate(
      id,
      { enabled, subject, template },
      { new: true }
    );
    return res.status(200).json(updated);
  }

  res.status(405).json({ error: "Method not allowed" });
}
