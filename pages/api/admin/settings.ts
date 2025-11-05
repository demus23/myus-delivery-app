// /pages/api/admin/settings.ts
import type { NextApiRequest, NextApiResponse } from "next";

let settings = {
  company: {
    name: "Cross Border Cart",
    logoUrl: "/cross-border-logo.png",
    supportEmail: "help@crossbordercart.com",
    supportPhone: "+971-xxx-xxxxxx",
    address: "Business Bay, Dubai, UAE",
  },
  preferences: {
    currency: "AED",
    timezone: "Asia/Dubai",
    language: "en",
    dateFormat: "dd/MM/yyyy",
    notifications: {
      email: true,
      sms: false,
      web: true,
    },
  },
  shipping: {
    defaultRate: 20,
    deliveryZones: [
      { country: "UAE" },
      { country: "KSA" },
      { country: "Oman" },
    ],
  },
  payments: {
    stripeKey: "",
    paypalKey: "",
    bankDetails: {
      account: "",
      iban: "",
      bank: "",
    },
  },
  security: {
    twoFA: false,
    sessions: [],
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.json(settings);
  if (req.method === "POST") {
    settings = { ...settings, ...req.body }; // deep merge in production!
    return res.json({ ok: true });
  }
  res.status(405).end();
}
