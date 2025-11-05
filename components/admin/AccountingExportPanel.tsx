// /components/admin/AccountingExportPanel.tsx
import { useState } from "react";
import { Row, Col, Form, Button } from "react-bootstrap";


export default function AccountingExportPanel() {
const [from, setFrom] = useState("");
const [to, setTo] = useState("");
const [method, setMethod] = useState("all");
const [dateField, setDateField] = useState("paidAt");
const [status, setStatus] = useState("paid");


const onExport = () => {
const params = new URLSearchParams();
if (from) params.set("from", from);
if (to) params.set("to", to);
if (method) params.set("method", method);
if (dateField) params.set("dateField", dateField);
if (status) params.set("status", status);
window.location.href = `/api/admin/accounting/export?${params.toString()}`;
};


return (
<Form className="border rounded p-3">
<Row className="g-2 align-items-end">
<Col md={3}>
<Form.Label>From</Form.Label>
<Form.Control type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
</Col>
<Col md={3}>
<Form.Label>To</Form.Label>
<Form.Control type="date" value={to} onChange={(e) => setTo(e.target.value)} />
</Col>
<Col md={2}>
<Form.Label>Date Field</Form.Label>
<Form.Select value={dateField} onChange={(e) => setDateField(e.target.value)}>
<option value="paidAt">Paid Date</option>
<option value="createdAt">Created Date</option>
</Form.Select>
</Col>
<Col md={2}>
<Form.Label>Method</Form.Label>
<Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
<option value="all">All</option>
<option value="card">Card</option>
<option value="bank">Bank</option>
<option value="cash">Cash</option>
<option value="link">Payment Link</option>
<option value="other">Other</option>
</Form.Select>
</Col>
<Col md={2}>
<Form.Label>Status</Form.Label>
<Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
<option value="paid">Paid</option>
<option value="all">All</option>
</Form.Select>
</Col>
</Row>
<div className="mt-3 d-flex justify-content-end">
<Button onClick={onExport}>Export CSV</Button>
</div>
</Form>
);
}