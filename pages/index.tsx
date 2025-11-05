// pages/index.tsx
import Link from "next/link";
import React from "react";

export default function HomePage() {
  return (
    <div style={{ background: "#f7fafc", minHeight: "100vh", fontFamily: "Inter, Arial, sans-serif" }}>
      {/* NAV */}
      <nav style={nav}>
        <div style={brand}>
          <span style={{ color: colors.mint }}>Croose Border</span> CART
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{ ...pillBtn, background: "transparent", color: "#fff", border: "1px solid #5a6b8f" }} className="btn">
            Login
          </Link>
          <Link href="/signup" style={{ ...pillBtn, background: colors.mint, color: "#09203a" }} className="btn btn-primary">
            Sign Up
          </Link>
          
        </div>

        {/* mobile menu placeholder (kept simple) */}
      </nav>

      {/* HERO */}
      <section style={heroSection}>
        <div style={badge}>Fast • Secure • Worldwide</div>
        <h1 style={heroTitle}>
          Ship. Track. Receive.
          <br />
          Your Package, <span style={{ background: grad.mintBlue, WebkitBackgroundClip: "text", color: "transparent" }}>Anywhere</span>.
        </h1>
        <p style={heroSubtitle}>
          Effortlessly ship from the UAE to the world—manage packages, track live,
          <br /> and enjoy secure delivery from your dashboard.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ ...cta, background: colors.blue }} className="btn btn-cta">
            Get Started Free
          </Link>
          <Link href="/login" style={{ ...cta, background: "#ffffff", color: colors.blue, boxShadow: "0 1px 8px #0b3bff1a" }} className="btn">
            Track a Shipment
          </Link>
        </div>

        <div style={{ fontSize: 36, marginTop: 36 }}>🚚 📦 🌎</div>
      </section>

      {/* FEATURES */}
      <section style={sectionContainer}>
        <h2 style={sectionTitle}>Why Crosse Border Cart</h2>
        <div style={featuresGrid}>
          <FeatureCard icon="🚀" title="Lightning-Fast" desc="Express lanes with partner carriers to get there sooner." accent="#eaf5ff" />
          <FeatureCard icon="📡" title="Real-Time Tracking" desc="Live location, status changes, and delivery ETA." accent="#ecfff8" />
          <FeatureCard icon="🛡️" title="Secure & Insured" desc="Optional insurance and verified hand-offs at each step." accent="#fff4ee" />
          <FeatureCard icon="💬" title="24/7 Support" desc="Humans on chat and email, around the clock." accent="#f6f3ff" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ ...sectionContainer, paddingTop: 18 }}>
        <h2 style={sectionTitle}>How It Works</h2>
        <div style={stepsGrid}>
          <Step no={1} title="Sign Up" desc="Create a free account with your email. It only takes a minute!" />
          <Step no={2} title="Add Your Package" desc="Enter details—tracking, courier, value, and more." />
          <Step no={3} title="Track & Receive" desc="Follow your delivery in real time until it arrives." />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ ...sectionContainer, maxWidth: 980 }}>
        <h2 style={sectionTitle}>What Customers Say</h2>
        <div style={testimonialsRow}>
          <Testimonial
            name="Aisha K."
            text="Shipping to Africa was a breeze. Real-time tracking gave me peace of mind. Highly recommended!"
          />
          <Testimonial
            name="Carlos G."
            text="Always on time. The dashboard is simple and support is amazing. 5 stars!"
          />
          <Testimonial
            name="Maria L."
            text="Finally a UAE delivery app that works! I use it for all my international orders."
          />
        </div>
      </section>

      {/* FAQ */}
      <section style={{ ...sectionContainer, maxWidth: 920 }}>
        <h2 style={sectionTitle}>FAQ</h2>
        <div>
          <FAQItem q="Is it free to create an account?" a="Yes! Signing up is free. You only pay when you ship." />
          <FAQItem q="Can I track my package live?" a="Absolutely. Every shipment comes with real-time tracking and updates." />
          <FAQItem q="What countries do you ship to?" a="We deliver to over 200 countries worldwide." />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={footer}>
        <div style={brandFooter}>
          <span style={{ color: colors.mint }}>Cross Border</span> Cart
        </div>
        <div style={{ color: "#c0cbea", marginBottom: 8 }}>
          &copy; {new Date().getFullYear()} Cross Border Cart. All rights reserved.
        </div>
        <div style={{ fontSize: 15, color: "#86d6cf" }}>Built with ❤️ in the UAE &amp; Africa.</div>
      </footer>

      {/* tiny CSS for hover + responsiveness */}
      <style jsx>{`
        .btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
        }
        .btn-primary:hover {
          filter: saturate(1.1);
        }
        .btn-cta:hover {
          box-shadow: 0 14px 30px rgba(33, 121, 232, 0.25);
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr !important;
          }
          h1 { font-size: 38px !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Design tokens ---------- */
const colors = {
  ink: "#223356",
  blue: "#2179e8",
  mint: "#21d2b8",
  inkDarker: "#16243d"
};

const grad = {
  nav: "linear-gradient(180deg, #0e1e36 0%, #132844 100%)",
  mintBlue: "linear-gradient(90deg, #21d2b8 0%, #3aa0ff 100%)",
};

/* ---------- Pieces ---------- */
const nav: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: grad.nav,
  color: "#fff",
  padding: "16px 48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  boxShadow: "0 8px 28px rgba(9, 32, 58, 0.28)",
  borderBottom: "1px solid rgba(255,255,255,0.06)"
};

const brand: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 30,
  letterSpacing: 0.8
};

const brandFooter: React.CSSProperties = { ...brand, fontSize: 26 };

const pillBtn: React.CSSProperties = {
  borderRadius: 12,
  padding: "10px 22px",
  fontWeight: 700,
  fontSize: 16,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};

const heroSection: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "88px 20px 48px",
  textAlign: "center"
};

const heroTitle: React.CSSProperties = {
  fontSize: 54,
  fontWeight: 900,
  color: colors.ink,
  lineHeight: 1.08,
  margin: "10px 0 10px"
};

const heroSubtitle: React.CSSProperties = {
  fontSize: 20,
  color: "#42537a",
  marginTop: 16,
  marginBottom: 26,
  fontWeight: 500
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 14px",
  background: "#ffffff",
  border: "1px solid #e8eef8",
  color: "#2e476c",
  borderRadius: 999,
  fontSize: 13,
  letterSpacing: 0.4,
  boxShadow: "0 2px 10px rgba(34, 51, 86, 0.06)"
};

const cta: React.CSSProperties = {
  color: "#fff",
  borderRadius: 12,
  padding: "14px 26px",
  fontWeight: 800,
  fontSize: 18,
  textDecoration: "none",
  boxShadow: "0 1px 12px rgba(9, 32, 58, 0.06)"
};

const sectionContainer: React.CSSProperties = {
  maxWidth: 1160,
  margin: "70px auto 0",
  padding: "0 20px"
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 32,
  color: colors.inkDarker,
  textAlign: "center",
  marginBottom: 28,
  letterSpacing: 0.4
};

const featuresGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(210px, 1fr))",
  gap: 18,
} as any;

const stepsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
  gap: 22,
} as any;

const footer: React.CSSProperties = {
  marginTop: 90,
  padding: "40px 0 14px",
  background: "#162a4a",
  color: "#fff",
  textAlign: "center",
  borderTop: "1px solid rgba(255,255,255,0.06)"
};

/* ---------- Components ---------- */
function FeatureCard({
  icon,
  title,
  desc,
  accent
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div
      className="grid"
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 8px 24px rgba(26, 42, 68, 0.08)",
        padding: "24px 22px",
        minHeight: 170,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: accent,
          display: "grid",
          placeItems: "center",
          fontSize: 24,
          boxShadow: "0 4px 12px rgba(26,42,68,0.05)"
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 800, fontSize: 20, color: "#183153" }}>{title}</div>
      <div style={{ color: "#607093", fontSize: 15, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Step({ no, title, desc }: { no: number; title: string; desc: string }) {
  return (
    <div
      className="grid"
      style={{
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 6px 18px rgba(26, 42, 68, 0.07)",
        padding: "22px 20px",
        textAlign: "left"
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eef3ff",
          color: colors.blue,
          fontWeight: 900,
          width: 34,
          height: 34,
          borderRadius: 10,
          fontSize: 16,
          marginBottom: 10
        }}
      >
        {no}
      </div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "#607093", fontSize: 15, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

const testimonialsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(240px, 1fr))",
  gap: 18
} as any;

function Testimonial({ name, text }: { name: string; text: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 8px 20px rgba(26, 42, 68, 0.08)",
        padding: "26px 24px",
        textAlign: "left"
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: colors.inkDarker, marginBottom: 8 }}>“{text}”</div>
      <div style={{ color: colors.mint, fontWeight: 900 }}>{name}</div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        marginBottom: 16,
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 6px 14px rgba(26, 42, 68, 0.06)",
        padding: "16px 20px"
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18, color: colors.ink }}>{q}</div>
      <div style={{ color: "#42537a", fontSize: 16, marginTop: 4, lineHeight: 1.6 }}>{a}</div>
    </div>
  );
}
