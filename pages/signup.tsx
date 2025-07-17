// /pages/signup.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    homeAddress: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess("Account created! Your UAE address is: " + data.user.suiteId);
      setForm({ name: "", email: "", password: "", homeAddress: "" });
      setTimeout(() => router.push("/login"), 2500);
    } else {
      setError(data.message || "Signup failed. Try again.");
    }
  };

  return (
    <div style={{
      background: "#f6faff",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        background: "#fff",
        padding: "2.5rem 2.5rem 1.5rem 2.5rem",
        borderRadius: 18,
        boxShadow: "0 8px 32px #21d2b815",
        maxWidth: 430,
        width: "100%"
      }}>
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 800, color: "#223356" }}>
          Create Your Free Account
        </h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
          <label style={labelStyle}>
            Name
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              style={inputStyle}
              required
              autoFocus
            />
          </label>
          <label style={labelStyle}>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </label>
          <label style={labelStyle}>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              style={inputStyle}
              required
              minLength={6}
            />
          </label>
          <label style={labelStyle}>
            Home Country Address
            <input
              name="homeAddress"
              type="text"
              value={form.homeAddress}
              onChange={handleChange}
              style={inputStyle}
              required
              placeholder="Your full delivery address in your country"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#2179e8",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "14px 0",
              fontWeight: 700,
              fontSize: 18,
              width: "100%",
              marginTop: 22,
              boxShadow: "0 1px 10px #2179e81a",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating Account…" : "Sign Up"}
          </button>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#2179e8", fontWeight: 700 }}>Login</Link>
          </div>
          {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
          {success && <div style={{ color: "green", marginTop: 16 }}>{success}</div>}
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: 16,
  marginBottom: 8,
  color: "#183153",
};
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "11px 14px",
  margin: "6px 0 22px 0",
  borderRadius: 10,
  border: "1px solid #d1e1f7",
  fontSize: 17,
  background: "#f8fafc",
};

