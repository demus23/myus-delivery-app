// pages/verify-email.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const token = (router.query.token as string) || "";
    if (!token) {
      setState("err");
      setMsg("Missing token.");
      return;
    }

    (async () => {
      try {
        const r = await fetch(`/api/auth/email/verify?token=${encodeURIComponent(token)}`);
        const data = await r.json();
        if (r.ok && data.ok) {
          setState("ok");
        } else {
          setState("err");
          setMsg(data?.error || "Verification failed.");
        }
      } catch {
        setState("err");
        setMsg("Network error.");
      }
    })();
  }, [router.query.token]);

  return (
    <main className="wrap">
      <section className="card">
        {state === "loading" && <h1>Verifying…</h1>}
        {state === "ok" && (
          <>
            <h1>Email verified 🎉</h1>
            <p>You can now sign in.</p>
            <Link href="/login" className="btn">Go to login</Link>
          </>
        )}
        {state === "err" && (
          <>
            <h1>Verification problem</h1>
            <p style={{ color: "#b91c1c", fontWeight: 600 }}>{msg}</p>
            <p>
              You can <Link href="/login">log in</Link> and use “Resend verification” to get a new link.
            </p>
          </>
        )}
      </section>

      <style jsx>{`
        .wrap { min-height: 100vh; display:grid; place-items:center; background:
          radial-gradient(900px 520px at 12% 14%, #e3ecff 0%, transparent 60%),
          radial-gradient(780px 480px at 88% 86%, #e6fff3 0%, transparent 60%),
          linear-gradient(160deg, #f8fafc, #eef2ff);
          padding: 24px;
        }
        .card { background:#fff; border:1px solid #e6e8ee; border-radius:20px; padding:28px; width:100%; max-width:520px; text-align:center; }
        h1 { margin: 0 0 8px; }
        .btn { display:inline-block; margin-top:12px; background:#2563eb; color:#fff; padding:10px 16px; border-radius:10px; text-decoration:none; }
      `}</style>
    </main>
  );
}
