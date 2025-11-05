// pages/signup.tsx
import { useState, FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { countries } from "@/utils/countries"; // keep this path as in your project

type Msg = { type: "success" | "error"; text: string } | null;

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]{8,}$/;

export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "",
    phone: "",
    addressLabel: "Home",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [showPw, setShowPw] = useState(false);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.password ||
      !form.country ||
      !form.address1 ||
      !form.city ||
      !form.postalCode
    ) {
      setMsg({ type: "error", text: "Please fill all required fields." });
      return;
    }

    if (!PASSWORD_RULE.test(form.password)) {
      setMsg({
        type: "error",
        text:
          "Password must be at least 8 characters and include upper, lower and a number.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          type: "success",
          text:
            "Signup successful! Please check your email to verify your account.",
        });
        setForm((f) => ({ ...f, password: "" }));
      } else {
        setMsg({ type: "error", text: data.error || "Signup failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Create account • Cross Border Cart</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="wrap theme">
        <div className="brand-chip">
          <img src="/logo.svg" alt="Cross Border Cart logo" />
          <span>Cross Border Cart</span>
        </div>

        <section className="card">
          <header className="card-head">
            <h1>Create your account</h1>
            <p className="subtitle">
              Start with your contact and first shipping address
            </p>
          </header>

          <form className="grid" onSubmit={onSubmit}>
            <div className="row two">
              <label className="field">
                <span>First name *</span>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={onChange}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="field">
                <span>Last name *</span>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={onChange}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>

            <div className="row two">
              <label className="field">
                <span>Email *</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label className="field">
                <span>Password *</span>
                <div className="pw">
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    autoComplete="new-password"
                    placeholder="At least 8 chars, upper, lower & number"
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>

            <div className="row two">
              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  autoComplete="tel"
                  placeholder="e.g. +971 50 123 4567"
                />
              </label>

              <label className="field">
                <span>Ship to Country *</span>
                <select
                  name="country"
                  value={form.country}
                  onChange={onChange}
                  required
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="row two">
              <label className="field">
                <span>Address label</span>
                <input
                  name="addressLabel"
                  value={form.addressLabel}
                  onChange={onChange}
                  placeholder="Home, Office…"
                />
              </label>

              <label className="field">
                <span>Address line 1 *</span>
                <input
                  name="address1"
                  value={form.address1}
                  onChange={onChange}
                  autoComplete="address-line1"
                  required
                />
              </label>
            </div>

            <div className="row two">
              <label className="field">
                <span>Address line 2</span>
                <input
                  name="address2"
                  value={form.address2}
                  onChange={onChange}
                  autoComplete="address-line2"
                />
              </label>

              <label className="field">
                <span>City *</span>
                <input
                  name="city"
                  value={form.city}
                  onChange={onChange}
                  autoComplete="address-level2"
                  required
                />
              </label>
            </div>

            <div className="row three">
              <label className="field">
                <span>State / Province</span>
                <input
                  name="state"
                  value={form.state}
                  onChange={onChange}
                  autoComplete="address-level1"
                />
              </label>

              <label className="field">
                <span>Postal code *</span>
                <input
                  name="postalCode"
                  value={form.postalCode}
                  onChange={onChange}
                  autoComplete="postal-code"
                  required
                />
              </label>

              <div className="spacer" />
            </div>

            <button type="submit" className="submit" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </button>

            {msg && (
              <div className={`msg ${msg.type === "success" ? "ok" : "err"}`}>
                {msg.text}
              </div>
            )}
          </form>

          <footer className="foot">
            Already have an account?{" "}
            <Link className="link" href="/login">
              Log in
            </Link>
          </footer>
        </section>
      </main>

      <style jsx>{`
        .theme {
          --accent: #2563eb;
          --accent-rgb: 37, 99, 235;
          --bg: #f8fafc;
          --card: #ffffff;
          --border: #e6e8ee;
          --text: #0f172a;
          --muted: #64748b;
          --danger: #ef4444;
          --success: #22c55e;
        }
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(900px 520px at 12% 14%, #e3ecff 0%, transparent 60%),
            radial-gradient(780px 480px at 88% 86%, #e6fff3 0%, transparent 60%),
            radial-gradient(600px 380px at 75% 20%, #f5e9ff 0%, transparent 60%),
            linear-gradient(160deg, var(--bg), #eef2ff);
          color: var(--text);
        }
        .brand-chip {
          position: fixed;
          top: 18px;
          left: 20px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #ffffffcc;
          border: 1px solid var(--border);
          backdrop-filter: blur(6px);
          box-shadow: 0 12px 28px rgba(var(--accent-rgb), 0.18);
        }
        .brand-chip img {
          height: 22px;
          width: 22px;
          object-fit: contain;
        }
        .brand-chip span {
          font-weight: 700;
          letter-spacing: 0.2px;
          color: var(--text);
          white-space: nowrap;
        }
        .card {
          width: 100%;
          max-width: 860px;
          border-radius: 22px;
          padding: 26px 28px 22px;
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 40px 100px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.03);
        }
        .card-head {
          text-align: center;
          margin-bottom: 12px;
        }
        .card-head h1 {
          margin: 6px 0 0 0;
          font-size: 32px;
        }
        .subtitle {
          margin-top: 6px;
          font-weight: 600;
          color: var(--accent);
        }
        .grid {
          display: grid;
          gap: 14px;
        }
        .row {
          display: grid;
          gap: 14px;
        }
        .row.two {
          grid-template-columns: 1fr 1fr;
        }
        .row.three {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .spacer {
          display: block;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .field span {
          font-size: 13px;
          color: var(--muted);
        }
        input,
        select {
          width: 100%;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          color: var(--text);
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        input::placeholder {
          color: #94a3b8;
        }
        input:focus,
        select:focus {
          border-color: color-mix(in oklab, var(--accent) 60%, white);
          box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.18);
        }
        .pw {
          position: relative;
          display: flex;
        }
        .pw input {
          padding-right: 78px;
        }
        .pw-toggle {
          position: absolute;
          right: 6px;
          top: 6px;
          height: 36px;
          padding: 0 12px;
          border: 1px solid var(--border);
          background: #f1f5f9;
          color: #0f172a;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .submit {
          margin-top: 8px;
          width: 100%;
          height: 48px;
          border-radius: 14px;
          border: 0;
          color: white;
          font-weight: 700;
          cursor: pointer;
          background: var(--accent);
          box-shadow: 0 10px 26px rgba(var(--accent-rgb), 0.22);
        }
        .msg {
          margin-top: 10px;
          font-size: 14px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #f8fafc;
        }
        .msg.err {
          border-color: color-mix(in oklab, var(--danger) 35%, white);
          color: color-mix(in oklab, var(--danger) 95%, black);
          background: #fff1f2;
        }
        .msg.ok {
          border-color: color-mix(in oklab, var(--success) 35%, white);
          color: color-mix(in oklab, var(--success) 95%, black);
          background: #ecfdf5;
        }
        .foot {
          margin-top: 10px;
          text-align: center;
        }
        .link {
          color: var(--accent);
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        @media (max-width: 860px) {
          .row.two,
          .row.three {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
