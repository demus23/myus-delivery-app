// pages/api/admin/hot-deals.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json([
    { name: "Amazon", discount: "Up to 55% Off", link: "https://amazon.com", logo: "/amazon.svg", color: "#ff9900" },
    { name: "Walmart", discount: "Up to 70% Off", link: "https://walmart.com", logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/Walmart_logo.svg", color: "#0071ce" },
    { name: "eBay", discount: "Up to 85% Off", link: "https://ebay.com", logo: "/ebay.svg", color: "#e53238" },
    { name: "SHEIN", discount: "Up to 90% Off", link: "https://shein.com", logo: "https://upload.wikimedia.org/wikipedia/commons/7/75/SHEIN_logo.svg", color: "#000" }
  ]);
}
