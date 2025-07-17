// pages/api/admin/activity.ts
import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.json([
    {
      id: 1,
      type: "Package Created",
      user: "nicodemus",
      detail: "Added package 'Shoes' for suite 101",
      date: "2025-07-16T09:10:00Z",
    },
    {
      id: 2,
      type: "User Registered",
      user: "lee",
      detail: "Registered new account",
      date: "2025-07-15T21:20:00Z",
    },
    {
      id: 3,
      type: "Package Updated",
      user: "nicodemus",
      detail: "Status changed to Shipped for tracking 123456",
      date: "2025-07-14T14:35:00Z",
    },
    {
      id: 4,
      type: "User Registered",
      user: "mira",
      detail: "Registered new account",
      date: "2025-07-14T08:11:00Z",
    },
    {
      id: 5,
      type: "Package Created",
      user: "nicodemus",
      detail: "Added package 'noon' for suite 102",
      date: "2025-07-13T17:49:00Z",
    },
    {
      id: 6,
      type: "Package Deleted",
      user: "admin",
      detail: "Deleted package 'old shoes' (suite 106)",
      date: "2025-07-13T15:12:00Z",
    },
    // ...add more logs if you want!
  ]);
}
