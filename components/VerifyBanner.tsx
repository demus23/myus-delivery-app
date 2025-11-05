// components/VerifyBanner.tsx
import { useState } from "react";

export default function VerifyBanner() {
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/auth/email/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setSent(true);
      setMsg(data?.message || "If that account exists, a link was sent.");
    } catch {
      setMsg("Could not send now. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      border:"1px solid #fde68a", background:"#fffbeb", color:"#92400e",
      padding:"10px 12px", borderRadius:12, marginBottom:12
    }}>
      <strong>Verify your email</strong> to unlock all features.
      <button
        onClick={resend}
        disabled={busy || sent}
        style={{
          marginLeft:10, padding:"6px 10px", borderRadius:8, border:"1px solid #f59e0b",
          background:"#fff7ed", cursor: (busy||sent) ? "not-allowed" : "pointer"
        }}
      >
        {busy ? "Sending…" : sent ? "Sent" : "Resend link"}
      </button>
      {msg && <span style={{marginLeft:10}}>{msg}</span>}
    </div>
  );
}
