// pages/forgot-password.tsx
import { useState } from "react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setDevLink(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // SAFE parse: don’t crash if body is empty or not JSON
      let data: any = {};
      try {
        data = await res.clone().json();
      } catch {
        // ignore – some handlers return 204/empty body
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      // Show generic success message (don’t leak whether email exists)
      setMsg("If that email exists, we’ve sent a reset link.");

      // In dev, your API can include the reset URL so you can click it
      if (data?.resetUrl) setDevLink(data.resetUrl);
    } catch (e: unknown) {
  console.error(e);
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Something went wrong. Please try again.";
  setErr(msg);

    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",
      background:"linear-gradient(180deg,#60a5fa 0%,#8b5cf6 100%)",padding:24}}>
      <section style={{width:"100%",maxWidth:560,background:"#fff",borderRadius:20,
        padding:28,boxShadow:"0 30px 80px rgba(0,0,0,.15)"}}>
        <h1 style={{margin:0,fontSize:44,lineHeight:1.1}}>Forgot password</h1>
        <p style={{color:"#475569",margin:"8px 0 22px"}}>
          Enter your email and we’ll send a reset link.
        </p>

        <form onSubmit={submit}>
          <label style={{display:"grid",gap:6,marginBottom:14}}>
            <span style={{color:"#64748b",fontSize:14}}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width:"100%",padding:"12px 14px",borderRadius:14,border:"1px solid #e5e7eb",
                outline:"none"
              }}
            />
          </label>

          {msg && <div style={{background:"#ecfdf5",border:"1px solid #bbf7d0",
            color:"#065f46",padding:"10px 12px",borderRadius:12,marginBottom:10}}>
            {msg}
          </div>}
          {err && <div style={{background:"#fff1f2",border:"1px solid #fecdd3",
            color:"#991b1b",padding:"10px 12px",borderRadius:12,marginBottom:10}}>
            {err}
          </div>}
          {devLink && (
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",
              color:"#1e40af",padding:"10px 12px",borderRadius:12,marginBottom:10}}>
              Dev reset link: <a href={devLink}>{devLink}</a>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{width:"100%",height:50,border:0,borderRadius:14,color:"#fff",
              background:"#0ea5e9",fontWeight:800,boxShadow:"0 10px 24px rgba(14,165,233,.28)",
              cursor: loading ? "not-allowed" : "pointer"}}>
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <div style={{marginTop:12}}>
            <Link href="/login" style={{color:"#0ea5e9",textDecoration:"none"}}>Back to login</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
