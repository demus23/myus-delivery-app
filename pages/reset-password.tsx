import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const strong = (pw: string) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()\-_=+{}[\]|:;<>,.~]{8,}$/.test(pw);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Read token and validate it
  useEffect(() => {
    const qTok =
      (router.query.token as string) ||
      new URLSearchParams(window.location.search).get("token") ||
      "";
    if (!qTok) {
      setErr("Missing token.");
      setChecking(false);
      return;
    }
    setToken(qTok);

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(qTok)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setValid(true);
        else setErr(d?.error || "Invalid or expired token.");
      })
      .catch(() => setErr("Unable to validate token."))
      .finally(() => setChecking(false));
  }, [router.query.token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (pw1 !== pw2) return setErr("Passwords do not match.");
    if (!strong(pw1))
      return setErr(
        "Password must be at least 8 characters and include upper, lower and a number."
      );

    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not reset password.");
      setMsg("Your password has been updated. Redirecting to sign in…");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e: unknown) {
  const msg =
    e instanceof Error ? e.message :
    typeof e === "string" ? e :
    "Something went wrong.";
  setErr(msg);     
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg,#60a5fa 0%,#8b5cf6 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 30px 80px rgba(0,0,0,.15)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 56, lineHeight: 1.05 }}>Set a new password</h1>
        <p style={{ color: "#475569", margin: "10px 0 22px" }}>
          Create a strong password you don’t use elsewhere.
        </p>

        {checking && <div>Validating token…</div>}
        {!checking && !valid && err && (
          <>
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#991b1b",
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              {err}
            </div>
            <Link href="/forgot-password" style={{ color: "#0ea5e9" }}>
              Request a new reset link
            </Link>
          </>
        )}

        {!checking && valid && (
          <form onSubmit={submit}>
            <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "#64748b" }}>New password</span>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <span style={{ color: "#64748b" }}>Confirm new password</span>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>

            {err && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#991b1b",
                  padding: "10px 12px",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                {err}
              </div>
            )}
            {msg && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#065f46",
                  padding: "10px 12px",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                height: 52,
                border: 0,
                borderRadius: 14,
                color: "#fff",
                background: "#0ea5e9",
                fontWeight: 800,
                boxShadow: "0 10px 24px rgba(14,165,233,.28)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
