// pages/api/track/[trackingNo].ts
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../track"; // re-use the query handler

export default function bySlug(req: NextApiRequest, res: NextApiResponse) {
  // /api/track/ABC123  ->  /api/track?trackingNo=ABC123
  const trackingNo = Array.isArray(req.query.trackingNo)
    ? req.query.trackingNo[0]
    : (req.query.trackingNo as string | undefined) || "";

  req.query = { ...req.query, trackingNo };
  return handler(req, res);
}
