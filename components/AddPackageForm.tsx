import React, { useState } from "react";

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "problem", label: "Problem" },
];

export default function AddPackageForm({ onCreated }: { onCreated?: () => void }) {
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [value, setValue] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!tracking || !courier || !value) {
      setError("Tracking, Courier, and Value are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking,
          courier,
          value: parseFloat(value),
          userEmail,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to add package.");
      } else {
        setTracking("");
        setCourier("");
        setValue("");
        setUserEmail("");
        setStatus("pending");
        if (onCreated) onCreated();
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420, margin: "0 auto", marginBottom: 32 }}>
      <h2>Add New Package</h2>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ marginBottom: 12 }}>
        <label>Tracking Number*</label>
        <input value={tracking} onChange={e => setTracking(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Courier*</label>
        <input value={courier} onChange={e => setCourier(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Value (USD)*</label>
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          min="0"
          required
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>User Email</label>
        <input value={userEmail} onChange={e => setUserEmail(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6 }}>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={loading} style={{
        padding: "9px 26px", background: "#2563eb", color: "#fff", border: "none",
        borderRadius: 8, fontWeight: 600, fontSize: 17, cursor: "pointer"
      }}>
        {loading ? "Adding..." : "Add Package"}
      </button>
    </form>
  );
}
