// pages/index.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Inter, Arial, sans-serif" }}>
      {/* NAV */}
      <nav style={{
        background: "#223356", color: "#fff", padding: "18px 48px", display: "flex",
        alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 16px #1a2a4407"
      }}>
        <div style={{ fontWeight: 900, fontSize: 32, letterSpacing: 1 }}>
          <span style={{ color: "#21d2b8" }}>MyUS</span> Delivery
        </div>
        <div>
          <Link href="/login" style={navBtnStyle}>Login</Link>
          <Link href="/signup" style={{ ...navBtnStyle, background: "#21d2b8", marginLeft: 10 }}>Sign Up</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        maxWidth: 960, margin: "auto", padding: "90px 0 42px 0", textAlign: "center"
      }}>
        <span style={{
          fontSize: 48, fontWeight: 900, color: "#223356", lineHeight: 1.1
        }}>
          Ship. Track. Receive.<br />Your Package, <span style={{ color: "#21d2b8" }}>Anywhere</span>.
        </span>
        <p style={{
          fontSize: 22, color: "#42537a", marginTop: 26, marginBottom: 36, fontWeight: 500
        }}>
          Effortlessly ship from the UAE to the world—manage packages, get full tracking, <br />
          and enjoy secure delivery from your dashboard.
        </p>
        <Link href="/signup" style={{
          background: "#2179e8",
          color: "#fff",
          borderRadius: 12,
          padding: "16px 44px",
          fontWeight: 700,
          fontSize: 22,
          textDecoration: "none",
          boxShadow: "0 1px 10px #2179e81a"
        }}>
          Get Started Free
        </Link>
        <div style={{ fontSize: 36, margin: "42px 0 0 0" }}>🚚 📦 🌎</div>
      </section>

      {/* FEATURES */}
      <section style={{
        maxWidth: 1100, margin: "70px auto 0 auto", display: "flex", gap: 38,
        justifyContent: "center", flexWrap: "wrap"
      }}>
        <FeatureCard icon="🚚" title="Super Fast Shipping" desc="We get your package anywhere in the world with speed & reliability." />
        <FeatureCard icon="📦" title="Full Real-Time Tracking" desc="Always know where your package is with instant notifications." />
        <FeatureCard icon="🔒" title="100% Secure Delivery" desc="Top-tier security and insurance on all shipments." />
        <FeatureCard icon="🕒" title="24/7 Customer Support" desc="We’re here for you, any time you need help." />
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        maxWidth: 970, margin: "90px auto 0 auto", padding: "18px 0 0 0"
      }}>
        <h2 style={sectionTitle}>How It Works</h2>
        <div style={{
          display: "flex", justifyContent: "space-between", gap: 32, flexWrap: "wrap"
        }}>
          <Step icon="1️⃣" title="Sign Up" desc="Create a free account with your email. It only takes a minute!" />
          <Step icon="2️⃣" title="Add Your Package" desc="Enter your package details—tracking, courier, value, and more." />
          <Step icon="3️⃣" title="Track & Receive" desc="Follow your delivery in real time until it arrives at your door." />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{
        maxWidth: 920, margin: "110px auto 0 auto", textAlign: "center"
      }}>
        <h2 style={sectionTitle}>What Customers Say</h2>
        <div style={{
          display: "flex", gap: 26, justifyContent: "center", flexWrap: "wrap"
        }}>
          <Testimonial
            name="Aisha K."
            text="MyUS Delivery made shipping to Africa so easy. Real-time tracking gave me peace of mind. Highly recommended!"
          />
          <Testimonial
            name="Carlos G."
            text="Packages always arrive on time. The dashboard is super simple and support is amazing. 5 stars!"
          />
          <Testimonial
            name="Maria L."
            text="Finally a UAE delivery app that works! I use it for all my international orders."
          />
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        maxWidth: 900, margin: "110px auto 0 auto"
      }}>
        <h2 style={sectionTitle}>FAQ</h2>
        <div>
          <FAQItem q="Is it free to create an account?" a="Yes! Signing up is free. You only pay when you ship." />
          <FAQItem q="Can I track my package live?" a="Absolutely. Every shipment comes with real-time tracking and updates." />
          <FAQItem q="What countries do you ship to?" a="We deliver to over 200 countries worldwide." />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 90, padding: "38px 0 10px 0", background: "#193154",
        color: "#fff", textAlign: "center"
      }}>
        <div style={{
          fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: 1
        }}>
          <span style={{ color: "#21d2b8" }}>MyUS</span> Delivery
        </div>
        <div style={{ color: "#c0cbea", marginBottom: 8 }}>
          &copy; {new Date().getFullYear()} MyUS Delivery. All rights reserved.
        </div>
        <div style={{ fontSize: 15, color: "#6cb9b8" }}>
          Built with ❤️ in the UAE & Africa.
        </div>
      </footer>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "#2179e8",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 30px",
  fontWeight: 700,
  fontSize: 18,
  marginLeft: 8,
  textDecoration: "none"
};
const sectionTitle: React.CSSProperties = {
  fontWeight: 800, fontSize: 34, color: "#223356", textAlign: "center", marginBottom: 30, letterSpacing: 0.5
};

// Feature card sub-component
function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px #1a2a4432",
      padding: "32px 24px", maxWidth: 240, minWidth: 200, textAlign: "center", flex: "1 1 180px"
    }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: "#183153" }}>{title}</div>
      <div style={{ color: "#607093", fontSize: 16 }}>{desc}</div>
    </div>
  );
}

// How-it-works step
function Step({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px #1a2a4413",
      padding: "26px 20px", width: 260, textAlign: "center", flex: "1 1 200px"
    }}>
      <div style={{ fontSize: 34, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 7 }}>{title}</div>
      <div style={{ color: "#607093", fontSize: 15 }}>{desc}</div>
    </div>
  );
}

// Testimonial
function Testimonial({ name, text }: { name: string, text: string }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, boxShadow: "0 2px 12px #1a2a4418",
      padding: "32px 30px", maxWidth: 270, textAlign: "left", margin: "0 8px"
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>“{text}”</div>
      <div style={{ color: "#21d2b8", fontWeight: 800 }}>{name}</div>
    </div>
  );
}

// FAQ item
function FAQItem({ q, a }: { q: string, a: string }) {
  return (
    <div style={{
      marginBottom: 19, background: "#fff", borderRadius: 12, boxShadow: "0 2px 7px #1a2a4411",
      padding: "17px 24px"
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#223356" }}>{q}</div>
      <div style={{ color: "#42537a", fontSize: 16, marginTop: 3 }}>{a}</div>
    </div>
  );
}

