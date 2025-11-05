// components/AdminLayout.tsx
import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import { Image } from "react-bootstrap";
import Head from "next/head";

const LOGO_URL = "/cross-border-logo.png";

const SIDEBAR_GROUPS = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: "bi-speedometer2", href: "/admin" },
      { label: "Users", icon: "bi-people", href: "/admin/users" },
      { label: "Packages", icon: "bi-box-seam", href: "/admin/packages" },
      { label: "Drivers", icon: "bi-truck", href: "/admin/drivers" },
      { label: "Stores", icon: "bi-shop", href: "/admin/stores" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Campaigns", icon: "bi-bullseye", href: "/admin/marketing" },
      { label: "Subscribers", icon: "bi-person-lines-fill", href: "/admin/marketing/subscribers" },
      { label: "Promotions", icon: "bi-gift", href: "/admin/marketing/promotions" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Activity", icon: "bi-activity", href: "/admin/activity" },
      { label: "Reports", icon: "bi-graph-up", href: "/admin/reports" },
      { label: "Inventory", icon: "bi-boxes", href: "/admin/inventory" },
    ],
  },
  {
    label: "Finance",
    items: [
      // Updated: single source of truth for your new page
      { label: "Charges", icon: "bi-receipt", href: "/admin/charges" },
      { label: "Transactions", icon: "bi-credit-card", href: "/admin/transactions" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "System Logs", icon: "bi-clock-history", href: "/admin/logs" },
      { label: "Settings", icon: "bi-gear", href: "/admin/settings" },
      { label: "Support", icon: "bi-chat-dots", href: "/admin/support" },
    ],
  },
];

// NEW: allow flat override links
type SidebarLink = { label: string; href: string; icon?: string };
type Props = { children: ReactNode; sidebarLinks?: SidebarLink[]; title?: string };

export default function AdminLayout({ children, sidebarLinks, title }: Props) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Dark mode: remember preference
  useEffect(() => {
    const darkPref = localStorage.getItem("darkMode");
    setDark(darkPref === "true");
  }, []);
  useEffect(() => {
    document.body.classList.toggle("admin-dark", dark);
    localStorage.setItem("darkMode", String(dark));
  }, [dark]);

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const toggleDark = () => setDark((d) => !d);

  // Decide which groups to render: override if sidebarLinks provided
  const groupsToRender =
    sidebarLinks && sidebarLinks.length
      ? [
          {
            label: "Navigation",
            items: sidebarLinks.map((l) => ({
              label: l.label,
              href: l.href,
              icon: l.icon ?? "bi-dot",
            })),
          },
        ]
      : SIDEBAR_GROUPS;

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <div className={`admin-root${dark ? " admin-dark" : ""}`}>
      <Head>
        <title>{title ? `${title} · Admin` : "Admin"}</title>
      </Head>

      {/* Sidebar */}
      <aside
        className={`admin-sidebar shadow-sm${sidebarOpen ? " open" : ""}${dark ? " dark" : ""}`}
        style={{
          width: 245,
          minHeight: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          background: dark ? "#191c24" : "#fff",
          borderRight: dark ? "1px solid #282d3d" : "1px solid #e5e7eb",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          color: dark ? "#d4d6dd" : "#222",
        }}
      >
        {/* Logo & Profile */}
        <div className="sidebar-header text-center border-bottom py-4" style={{ borderColor: dark ? "#222c" : "#e5e7eb" }}>
          <Image src={LOGO_URL} alt="Cross Border Cart" height={44} />
          <h5 className="fw-bold mb-0 mt-2" style={{ color: "#08b1ee" }}>Cross Border Cart</h5>
          <div className="avatar-circle mx-auto mt-1" style={{ background: dark ? "#303856" : "#e0e7ef" }}>N</div>
          <div className="small text-muted" style={{ color: dark ? "#9da3b5" : "" }}>Super Admin</div>
        </div>

        {/* Sidebar links */}
        <nav className="flex-grow-1 overflow-auto px-2" style={{ minHeight: 0, marginBottom: 0 }}>
          {groupsToRender.map((group, idx) => (
            <div key={group.label} className="mb-3">
              <div
                className="sidebar-group-label text-uppercase small px-2 mb-2"
                style={{
                  letterSpacing: 0.5,
                  fontWeight: 600,
                  color: dark ? "#a1aacb" : "#6c757d",
                  background: dark ? "#191c24" : "#fff",
                }}
              >
                {group.label}
              </div>
              <ul className="list-unstyled mb-0">
                {group.items.map((link: any) => {
                  const active = isActive(link.href);
                  return (
                    <li key={link.href}>
                     <Link
  href={link.href}
  className={`d-flex align-items-center px-3 py-2 mb-1 sidebar-link${active ? " active" : ""}`}
  aria-current={active ? "page" : undefined}
  style={{
    borderRadius: 8,
    fontWeight: active ? 700 : 500,
    fontSize: 16,
    color: active ? "#08b1ee" : (dark ? "#d4d6dd" : "#222"),
    background: active ? (dark ? "#223147" : "#e8f6fd") : "transparent",
    textDecoration: "none",
  }}
>
  <i className={`bi ${link.icon} me-3`} style={{ fontSize: 19 }} />
  <span>{link.label}</span>
</Link>
                    </li>
                  );
                })}
              </ul>
              {idx !== groupsToRender.length - 1 && (
                <hr className="my-2" style={{ borderColor: dark ? "#2a2f3c" : "#e5e7eb" }} />
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div
          className="text-center small mb-2 pt-2 border-top"
          style={{
            borderColor: dark ? "#222c" : "#e5e7eb",
            color: dark ? "#9da3b5" : "#888",
          }}
        >
          &copy; {new Date().getFullYear()} Cross Border Cart
        </div>
      </aside>

      {/* Topbar */}
      <header
        style={{
          position: "fixed",
          left: 245,
          right: 0,
          top: 0,
          height: 64,
          background: dark ? "#191c24" : "#fff",
          borderBottom: dark ? "1px solid #282d3d" : "1px solid #e5e7eb",
          zIndex: 1050,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          justifyContent: "space-between",
        }}
      >
        <button
          className="btn btn-link d-md-none"
          style={{ fontSize: 26, color: "#08b1ee" }}
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <i className="bi bi-list"></i>
        </button>
        <div className="fw-bold" style={{ color: "#08b1ee" }}>
          {title || "Cross Border Cart Admin Panel"}
        </div>
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-sm btn-outline-secondary"
            style={{
              borderRadius: 20,
              border: "none",
              background: dark ? "#26304a" : "#f4f8fb",
              color: dark ? "#a1aacb" : "#555",
            }}
            onClick={toggleDark}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <i className={`bi ${dark ? "bi-sun" : "bi-moon"} me-1`}></i>
            {dark ? "Light" : "Dark"}
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Logout"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
          <span className="avatar-circle" style={{ background: dark ? "#303856" : "#e0e7ef" }}>N</span>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          marginLeft: 245,
          paddingTop: 64,
          minHeight: "100vh",
          background: dark ? "#161925" : "#f6f8fb",
          color: dark ? "#e8ebf2" : "#23263a",
        }}
      >
        <div className="container-fluid px-4">{children}</div>
      </main>

      {/* Responsive Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 2500,
          }}
        />
      )}

      <style jsx global>{`
        .admin-sidebar { transition: left 0.3s; }
        @media (max-width: 768px) {
          .admin-sidebar { left: ${sidebarOpen ? "0" : "-245px"}; width: 245px; box-shadow: 0 4px 24px #0002; }
          main { margin-left: 0 !important; }
          header { left: 0 !important; }
        }
        .sidebar-link:hover, .sidebar-link.active {
          background: #e8f6fd !important;
          color: #08b1ee !important;
        }
        .admin-dark .sidebar-link:hover, .admin-dark .sidebar-link.active {
          background: #223147 !important;
          color: #08b1ee !important;
        }
        .avatar-circle {
          background: #e0e7ef;
          width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center;
          border-radius: 50%; font-weight: bold; font-size: 20px; color: #555;
        }
        .admin-dark .avatar-circle { background: #303856; color: #e0e7ef; }
        .sidebar-header { position: sticky; top: 0; background: inherit; z-index: 2; }
        nav.flex-grow-1 { overflow-y: auto; max-height: calc(100vh - 140px); }
        .sidebar-group-label { position: sticky; top: 0; background: inherit; z-index: 1; }
        .admin-dark { background: #161925; }
      `}</style>
    </div>
  );
}
