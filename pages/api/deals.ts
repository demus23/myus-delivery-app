import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // simple mock list
  const deals = [
    { id: "d1", store: "Amazon AE", title: "Up to 30% on gadgets", url: "https://amazon.ae", logo: "/amazon.svg", discountText: "-30%" },
    { id: "d2", store: "Noon",      title: "Daily price crash",    url: "https://noon.com",   logo: "/noon.svg",   discountText: "Hot"  },
    { id: "d3", store: "eBay",      title: "Refurb laptops",       url: "https://ebay.com",   logo: "/ebay.svg" },
  ];
  res.status(200).json({ deals });
}
