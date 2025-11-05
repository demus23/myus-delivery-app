// pages/settings/security.tsx
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";

const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()\-_=+{}[\]|:;<>,.~]{8,}$/;

export default function SecuritySettings() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err"; text:string} | null>(null);
  const router = useRouter();

  const canSubmit = !!currentPassword && STRONG.test(newPassword) && newPassword === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!canSubmit) {
      setMsg({ type: "err", text: "Fix the errors above before continuing." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to change password.");

      setMsg({ type: "ok", text: "Password changed successfully. Please sign in again." });
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1200);
    } catch (err: any) {
      setMsg({ type: "err", text: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Security • Cross Border Cart</title></Head>
      <main className="wrap">
        <section className="card">
          <h1>Security</h1>
          <p className="sub">Update your password.</p>

          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span>Current password</span>
              <input type="password" value={currentPassword} onChange={e=>setCurrent(e.target.value)} required />
            </label>

            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={e=>setNew(e.target.value)}
                required
              />
              <small className={STRONG.test(newPassword) ? "hint ok" : "hint"}>
                Must be 8+ chars and include upper, lower and a number.
              </small>
            </label>

            <label className="field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirm}
                onChange={e=>setConfirm(e.target.value)}
                required
              />
              {confirm && confirm !== newPassword && (
                <small className="hint err">Passwords do not match.</small>
              )}
            </label>

            <button className="btn" disabled={!canSubmit || loading}>
              {loading ? "Saving…" : "Change password"}
            </button>

            {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
          </form>
        </section>
      </main>

      <style jsx>{`
        .wrap{min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#e6f0ff,#f6f9ff);padding:24px}
        .card{width:100%;max-width:520px;background:#fff;border:1px solid #e6e8ee;border-radius:18px;padding:28px;box-shadow:0 18px 60px rgba(15,23,42,.08)}
        h1{margin:0 0 6px 0}
        .sub{margin:0 0 18px 0;color:#64748b}
        .form{display:grid;gap:14px}
        .field{display:grid;gap:6px}
        input{padding:12px 14px;border:1px solid #e6e8ee;border-radius:12px;outline:none}
        input:focus{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
        .hint{font-size:12px;color:#ef4444}
        .hint.ok{color:#16a34a}
        .hint.err{color:#ef4444}
        .btn{height:46px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
        .btn:disabled{opacity:.6;cursor:not-allowed}
        .msg{margin-top:8px;padding:10px;border-radius:10px;border:1px solid #e6e8ee}
        .msg.ok{background:#ecfdf5;border-color:#bbf7d0}
        .msg.err{background:#fff1f2;border-color:#fecaca}
      `}</style>
    </>
  );
}
