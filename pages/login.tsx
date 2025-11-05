// pages/login.tsx
import { useState, FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.ok && !res.error) {
      setMessage({ type: "ok", text: "Login successful! Redirecting…" });
      router.push("/dashboard");
    } else {
      setMessage({ type: "err", text: "Invalid email or password." });
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in • Cross Border Cart</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* IMPORTANT: variables live on this wrapper */}
      <main className="login-wrap theme">
        <div className="brand-chip">
          <img src="/logo.svg" alt="Cross Border Cart logo" />
          <span>Cross Border Cart</span>
        </div>

        <section className="card">
          <header className="card-head">
            <div className="site-link-wrap">
              <Link href="/" className="site-link">crossbordercart.com</Link>
            </div>
            <h1>Welcome back</h1>
            <p className="subtitle">Sign in to access your dashboard</p>
          </header>

          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="pw">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="row">
              {/* Forgot password link */}
              <Link href="/forgot-password" className="link">Forgot password?</Link>

            </div>

            {/* Put under “Forgot password?” */}
  <button
  type="button"
  className="link"
  onClick={async () => {
    if (!email) return alert("Enter your email first.");
    const r = await fetch("/api/auth/email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await r.json();
    if (r.ok) {
      alert("If that email exists and is unverified, we sent a verification link.");
      if (data.verifyUrl) console.log("DEV verify link:", data.verifyUrl);
    } else {
      alert(data.error || "Could not send verification link.");
    }
  }}
>
  Resend verification
</button>


            <button className="submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" aria-hidden /> : <span>Sign in</span>}
            </button>

            {message && (
              <div role="status" aria-live="polite" className={`msg ${message.type === "ok" ? "ok" : "err"}`}>
                {message.text}
              </div>
            )}
          </form>

          <footer className="card-foot">
            <span className="muted">
              By continuing you agree to our{" "}
              <a className="link" href="#" onClick={(e) => e.preventDefault()}>Terms</a> and{" "}
              <a className="link" href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
            </span>
          </footer>
        </section>
      </main>

      <style jsx>{`
        /* Put variables on .theme (the wrapper), not :root */
        .theme {
          /* Pick ONE color:
             Blue  -> #2563eb  (and 37,99,235 below)
             Green -> #16a34a  (and 22,163,74  below)
          */
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

        .login-wrap {
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
          top: 18px; left: 20px;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 12px;
          background: #ffffffcc;
          border: 1px solid var(--border);
          backdrop-filter: blur(6px);
          box-shadow: 0 12px 28px rgba(var(--accent-rgb), 0.18);
        }
        .brand-chip img { height: 22px; width: 22px; object-fit: contain; }
        .brand-chip span { font-weight: 700; letter-spacing: .2px; color: var(--text); white-space: nowrap; }

        .card {
          width: 100%; max-width: 480px;
          border-radius: 22px; padding: 30px;
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 40px 100px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(0,0,0,0.03);
        }
        .card-head { text-align: center; margin-bottom: 16px; }
        .card-head h1 { margin: 8px 0 0 0; font-size: 30px; line-height: 1.2; }

        /* SOLID subtitle color (forced) */
        .subtitle {
          margin-top: 6px;
          font-weight: 600;
          letter-spacing: .2px;
          color: var(--accent) !important;
        }

        .muted { color: var(--muted); }
        .card-foot { text-align: center; margin-top: 18px; }

        .site-link-wrap { display: flex; justify-content: center; }
        .site-link {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 999px; font-size: 12px;
          color: var(--accent); background: #eff6ff; border: 1px solid #dbeafe; text-decoration: none;
        }
        .site-link:hover { background: #e0f2fe; border-color: #bae6fd; }

        .form { display: grid; gap: 14px; }
        .field { display: grid; gap: 6px; }
        .field span { font-size: 13px; color: var(--muted); }

        input {
          width: 100%;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          color: var(--text);
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        input::placeholder { color: #94a3b8; }
        input:focus {
          border-color: color-mix(in oklab, var(--accent) 60%, white);
          box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.18);
        }

        .pw { position: relative; display: flex; }
        .pw input { padding-right: 78px; }
        .pw-toggle {
          position: absolute; right: 6px; top: 6px;
          height: 36px; padding: 0 12px;
          border: 1px solid var(--border);
          background: #f1f5f9;
          color: var(--text);
          border-radius: 10px; font-size: 13px;
          cursor: pointer;
          transition: background 120ms ease, transform 80ms ease;
        }
        .pw-toggle:hover { background: #e9eef5; }
        .pw-toggle:active { transform: translateY(1px); }

        .row { display: flex; justify-content: flex-end; margin-top: 4px; }
        .link { color: var(--accent); text-decoration: none; }
        .link:hover { text-decoration: underline; }

        /* SOLID button using --accent (forced) */
        .submit {
          margin-top: 8px; width: 100%; height: 48px;
          border-radius: 14px; border: 0; color: white; font-weight: 700; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          background: var(--accent) !important;
          box-shadow: 0 10px 26px rgba(var(--accent-rgb), 0.22);
          transition: transform 80ms ease, filter 120ms ease, box-shadow 120ms ease;
        }
        .submit:hover { filter: brightness(1.03); }
        .submit:active { transform: translateY(1px); }
        .submit:disabled { opacity: .7; cursor: not-allowed; box-shadow: none; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,.45); border-top-color: white;
          border-radius: 50%; animation: spin 700ms linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .msg {
          margin-top: 12px; font-size: 14px; text-align: center;
          padding: 10px 12px; border-radius: 10px;
          border: 1px solid var(--border); background: #f8fafc;
        }
        .msg.err { border-color: color-mix(in oklab, var(--danger) 35%, white); color: color-mix(in oklab, var(--danger) 95%, black); background: #fff1f2; }
        .msg.ok  { border-color: color-mix(in oklab, var(--success) 35%, white); color: color-mix(in oklab, var(--success) 95%, black); background: #ecfdf5; }

        @media (max-width: 480px) {
          .card { padding: 24px; border-radius: 18px; }
          .card-head h1 { font-size: 26px; }
          .brand-chip { gap: 8px; padding: 7px 10px; }
        }
      `}</style>
    </>
  );
}
