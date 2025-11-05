// lib/fakeStore.ts
export type Charge = {
  invoiceNo: string;
  userId: string;
  amount: number;
  currency: string;
  description?: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  createdAt: string;
  method?: { type: "card" | "paypal" | "wire"; brand?: string; last4?: string; label?: string };
};

export type UserLite = { id: string; name: string; email: string };

export const USERS: Record<string, UserLite> = {
  u1: { id: "u1", name: "nicodemus", email: "nico@example.com" },
  u2: { id: "u2", name: "Alice", email: "alice@example.com" },
};

export const CHARGES: Charge[] = [
  {
    invoiceNo: "INV-20250828-D2ABB",
    userId: "u1",
    amount: 10000,
    currency: "AED",
    description: "Manual charge",
    status: "succeeded",
    createdAt: new Date().toISOString(),
    method: { type: "card", brand: "VISA", last4: "1234" },
  },
];

export function findCharge(invoiceNo: string) {
  return CHARGES.find((c) => c.invoiceNo === invoiceNo);
}

export function toAdminRow(c: Charge) {
  return {
    ...c,
    userDoc: USERS[c.userId] ?? null,
  };
}
