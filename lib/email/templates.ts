export const payLinkEmail = (name: string, invoiceNo: string, amount: string, url: string) => `
  <p>Hi ${name || ""},</p>
  <p>Your invoice <strong>${invoiceNo}</strong> for <strong>${amount}</strong> is ready.</p>
  <p><a href="${url}" style="background:#0d6efd;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Pay securely</a></p>
  <p>If you’ve already paid, you can ignore this message.</p>`;

export const receiptEmail = (name: string, invoiceNo: string, amount: string, receiptUrl: string) => `
  <p>Hi ${name || ""},</p>
  <p>Thanks! We received your payment for <strong>${invoiceNo}</strong> (<strong>${amount}</strong>).</p>
  <p><a href="${receiptUrl}">View Stripe receipt</a></p>
  <p>Need help? Reply to this email.</p>`;
