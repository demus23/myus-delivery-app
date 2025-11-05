// lib/invoices/payNowHtml.ts
export function buildPayNowHtml(
  info: {
    invoiceNo: string;
    amount: number; currency: string;
    description?: string;
    checkoutUrl: string;
  },
  origin: string,
  token?: string
) {
  const amt = `${info.currency} ${(Number(info.amount || 0) / 100).toFixed(2)}`;
  const q = token ? `&token=${encodeURIComponent(token)}` : "";
  const inv = encodeURIComponent(info.invoiceNo);
  const htmlHref = `${origin}/api/invoices/${inv}?format=html${q}`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Invoice ${info.invoiceNo}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.btn{display:inline-block;padding:10px 14px;border-radius:8px;background:#0ea5a2;color:#fff;text-decoration:none}</style></head>
<body>
  <h2>Invoice ${info.invoiceNo}</h2>
  <p><strong>Amount due:</strong> ${amt}</p>
  <p><strong>Description:</strong> ${info.description || "Charge"}</p>
  <p><a class="btn" href="${info.checkoutUrl}" target="_blank" rel="noreferrer">Pay now</a></p>
  <p>Or <a href="${htmlHref}" target="_blank" rel="noreferrer">view the invoice online</a>.</p>
</body></html>`;
}
