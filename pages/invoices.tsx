// /pages/invoices.tsx
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import { Container, Table, Button, Badge, Spinner } from "react-bootstrap";


interface InvoiceRow {
invoiceNo: string;
status: "draft" | "sent" | "paid" | "void";
total: number;
currency: string;
method?: string | null;
createdAt?: string;
paidAt?: string;
}


export default function MyInvoicesPage() {
const { status } = useSession();
const router = useRouter();
const [loading, setLoading] = useState(true);
const [invoices, setInvoices] = useState<InvoiceRow[]>([]);


useEffect(() => {
if (status === "unauthenticated") {
signIn(undefined, { callbackUrl: "/invoices" });
}
}, [status]);


useEffect(() => {
if (status !== "authenticated") return;
let mounted = true;
(async () => {
try {
const res = await fetch("/api/invoices/my");
const data = await res.json();
if (mounted) setInvoices(data.invoices || []);
} catch (e) {
console.error(e);
} finally {
if (mounted) setLoading(false);
}
})();
return () => {
mounted = false;
};
}, [status]);


const handlePay = useCallback(async (invoiceNo: string) => {
try {
const res = await fetch("/api/payments/paylink", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ invoiceNo }),
});
const data = await res.json();
if (!res.ok) throw new Error(data?.error || "Failed to create pay link");
if (data?.url) {
window.location.href = data.url; // redirect to Stripe Payment Link / Checkout
}
} catch (err) {
alert((err as Error).message);
}
}, []);


const handleReceipt = useCallback((invoiceNo: string) => {
// Open your existing PDF endpoint in a new tab. If your path differs, adjust here.
const url = `/api/invoices/${encodeURIComponent(invoiceNo)}?format=pdf`;
window.open(url, "_blank");
}, []);
const badgeForStatus = (s: InvoiceRow["status"]) => {
const map: Record<InvoiceRow["status"], string> = {
draft: "secondary",
sent: "warning",
paid: "success",
void: "dark",
};
return <Badge bg={map[s]} className="text-uppercase">{s}</Badge>;
};


return (
<Container className="py-4">
<h1 className="mb-3">My Invoices</h1>
{loading ? (
<div className="d-flex align-items-center gap-2"><Spinner animation="border" size="sm"/> Loading…</div>
) : (
<Table hover responsive className="align-middle">
<thead>
<tr>
<th>Invoice #</th>
<th>Date</th>
<th>Status</th>
<th>Method</th>
<th className="text-end">Amount</th>
<th className="text-end">Actions</th>
</tr>
</thead>
<tbody>
{invoices.length === 0 && (
<tr>
<td colSpan={6} className="text-muted">No invoices yet.</td>
</tr>
)}
{invoices.map((inv) => (
<tr key={inv.invoiceNo}>
<td>{inv.invoiceNo}</td>
<td>{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—")}</td>
<td>{badgeForStatus(inv.status)}</td>
<td>{inv.method || "—"}</td>
<td className="text-end">{inv.total.toLocaleString(undefined, { style: "currency", currency: inv.currency || "AED" })}</td>
<td className="text-end d-flex justify-content-end gap-2">
{inv.status !== "paid" && (
<Button size="sm" variant="primary" onClick={() => handlePay(inv.invoiceNo)}>Pay</Button>
)}
<Button size="sm" variant="outline-secondary" onClick={() => handleReceipt(inv.invoiceNo)}>Receipt</Button>
</td>
</tr>
))}
</tbody>
</Table>
)}
</Container>
);
}