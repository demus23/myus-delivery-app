// lib/invoices/html.ts
export function renderInvoiceHTML(invoice: any) {
  const number = invoice?.invoiceNo ?? invoice?.number ?? "—";
  const created = invoice?.createdAt ? new Date(invoice.createdAt).toLocaleString() : "";
  const customerName = invoice?.customer?.name ?? invoice?.user?.name ?? "Customer";
  const items: Array<any> = invoice?.items ?? [];
  const currency = invoice?.currency ?? "AED";
  const subtotal = invoice?.subtotal ?? items.reduce((s, it) => s + (it.quantity || 1) * (it.unitPrice || 0), 0);
  const tax = invoice?.tax ?? 0;
  const total = invoice?.total ?? subtotal + tax;

  const rows = items.map((it: any) => `
    <tr>
      <td>${it.sku ?? ""}</td>
      <td>${it.description ?? it.title ?? ""}</td>
      <td style="text-align:right">${it.quantity ?? 1}</td>
      <td style="text-align:right">${(it.unitPrice ?? 0).toFixed(2)}</td>
      <td style="text-align:right">${(((it.quantity ?? 1) * (it.unitPrice ?? 0))).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Invoice #${number}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif; color:#111; margin:0; padding:32px;}
  .h1{font-size:22px; font-weight:700; margin:0 0 4px}
  .muted{color:#666}
  .grid{display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0 24px}
  table{width:100%; border-collapse:collapse; font-size:14px}
  th,td{border-bottom:1px solid #eee; padding:10px 6px}
  th{background:#fafafa; text-align:left}
  .totals{margin-top:16px; width:320px; margin-left:auto}
  .totals td{border:none; padding:6px}
  .totals td:last-child{text-align:right}
</style></head>
<body>
  <div class="h1">Invoice #${number}</div>
  <div class="muted">Date: ${created}</div>

  <div class="grid">
    <div>
      <div class="muted" style="margin-bottom:6px">Billed To</div>
      <div>${customerName}</div>
      <div class="muted">${invoice?.customer?.email ?? invoice?.user?.email ?? ""}</div>
    </div>
    <div>
      <div class="muted" style="margin-bottom:6px">From</div>
      <div>${invoice?.merchant?.name ?? "Cross Border Cart"}</div>
      <div class="muted">${invoice?.merchant?.email ?? ""}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>SKU</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Line Total</th></tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5" class="muted">No items</td></tr>`}</tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td>${currency} ${Number(subtotal).toFixed(2)}</td></tr>
    <tr><td>Tax</td><td>${currency} ${Number(tax).toFixed(2)}</td></tr>
    <tr><td><strong>Total</strong></td><td><strong>${currency} ${Number(total).toFixed(2)}</strong></td></tr>
  </table>
</body></html>`;
}
