import { useEffect, useState } from "react";
import AdminLayout from "../../../components/AdminLayout";
import { Table, Button, Spinner, Form, InputGroup } from "react-bootstrap";
import Papa from "papaparse";

const types = [
  { label: "Packages", value: "packages" },
  { label: "Users", value: "users" },
  { label: "Inventory", value: "inventory" },
  { label: "Activity Log", value: "activity" }
  // Add more as needed
];

export default function ReportsPage() {
  const [type, setType] = useState("packages");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/admin/reports?type=${type}`)
      .then(res => res.json())
      .then(data => {
        setData(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(fetchData, [type]);

  // Filter
  const filtered = data.filter(row =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase())
  );

  // Export CSV
  function exportCSV() {
    const csv = Papa.unparse(filtered.map(row => {
      // Remove sensitive fields
      const { password, ...rest } = row;
      return rest;
    }));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${type}-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Columns based on type (auto from data keys)
  const columns = filtered[0] ? Object.keys(filtered[0]).filter(key => key !== "__v") : [];

  return (
    <AdminLayout>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 style={{ fontWeight: 700 }}>Reports</h1>
        <div className="d-flex gap-2">
          <Form.Select value={type} onChange={e => setType(e.target.value)} style={{ minWidth: 160 }}>
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Form.Select>
          <InputGroup>
            <Form.Control
              placeholder="Search all fields"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </InputGroup>
          <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>
      <Table hover responsive className="bg-white shadow-sm rounded">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>{col.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length}><Spinner animation="border" /></td></tr>
          ) : filtered.length === 0 ? (
            <tr><td colSpan={columns.length}>No data found.</td></tr>
          ) : filtered.map((row, i) => (
            <tr key={row._id || row.id || i}>
              {columns.map(col => <td key={col}>{row[col]?.toString() || "--"}</td>)}
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminLayout>
  );
}
