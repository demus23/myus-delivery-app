export function buildReceiptHtml(
  pay: {
    invoiceNo: string;
    amount: number;      // minor units (cents)
    currency: string;
    description?: string;
    status: "succeeded" | "pending" | "failed" | "refunded";
    createdAt: Date | string;
    method?: { type?: string; label?: string; brand?: string; last4?: string }; // <-- updated
    billingAddress?: { fullName?: string };
  },
  origin?: string,
  token?: string
) {
  const when = new Date(pay.createdAt);
  const amt = `${pay.currency} ${(Number(pay.amount || 0) / 100).toFixed(2)}`;
  const q = token ? `&token=${encodeURIComponent(token)}` : "";
  const inv = encodeURIComponent(pay.invoiceNo);

  const htmlHref = `${origin || ""}/api/invoices/${inv}?format=html${q}`;
  const pdfHref  = `${origin || ""}/api/invoices/${inv}?format=pdf${q}`;

  return `<!doctype html><html><head><meta charset="utf-8"/><title>${pay.invoiceNo}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}</style></head>
<body>
  <h2>Receipt ${pay.invoiceNo}</h2>
  <p>${when.toLocaleString()}</p>
  <p><strong>Billed To:</strong> ${pay.billingAddress?.fullName || ""}</p>
  <p><strong>Description:</strong> ${pay.description || "Charge"}</p>
  <p><strong>Total:</strong> ${amt}</p>
  <p><strong>Status:</strong> ${pay.status}</p>
  <p><strong>Method:</strong> ${pay.method?.type || "—"} ${pay.method?.label ? `(${pay.method.label})` : ""}</p>
  <p>
    <a href="${htmlHref}" target="_blank" rel="noreferrer">View online</a> ·
    <a href="${pdfHref}" target="_blank" rel="noreferrer">Download PDF</a>
  </p>
</body></html>`;
}
