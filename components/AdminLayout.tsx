import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "Admin";

  // Helper for sidebar highlighting
  const isActive = (href: string, exact = false) => {
    if (exact) return router.pathname === href;
    return router.pathname.startsWith(href);
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* SIDEBAR */}
      <nav
        className="bg-dark text-white d-flex flex-column p-3"
        style={{
          width: 230,
          minHeight: "100vh",
          position: "sticky",
          left: 0,
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="mb-4 text-center">
          {/* Logo (you can swap this for <img src="/logo.png" ... /> later) */}
          <div
            className="bg-primary text-white rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
            style={{ width: 48, height: 48, fontSize: 28 }}
          >
            Y
          </div>
          <div className="fs-5 fw-bold" style={{ letterSpacing: 1 }}>Your Admin</div>
        </div>
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-2">
            <Link href="/admin" legacyBehavior>
              <a className={`nav-link${isActive("/admin", true) ? " active bg-primary text-white" : " text-white"}`}>Dashboard</a>
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link href="/admin/packages" legacyBehavior>
              <a className={`nav-link${isActive("/admin/packages") && !isActive("/admin/packages/new", true) ? " active bg-primary text-white" : " text-white"}`}>Packages</a>
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link href="/admin/packages/new" legacyBehavior>
              <a className={`nav-link${isActive("/admin/packages/new", true) ? " active bg-primary text-white" : " text-white"}`}>Add Package</a>
            </Link>
          </li>
          <li className="nav-item mb-2">
            <Link href="/admin/users" legacyBehavior>
              <a className={`nav-link${isActive("/admin/users", true) ? " active bg-primary text-white" : " text-white"}`}>Users</a>
            </Link>
          </li>
        </ul>
        <div className="mt-auto pt-5">
          <hr className="border-light" />
          <div className="text-center text-secondary">v1.0</div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex-grow-1">
        {/* TOPBAR */}
        <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-white" style={{ minHeight: 80 }}>
          <div>
            <span className="fs-4 fw-bold">Admin Panel</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold">{userName}</span>
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <span className="avatar bg-primary text-white rounded-circle" style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {userName[0]}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#">My Profile</a></li>
                <li><button className="dropdown-item" onClick={() => signOut()}>Logout</button></li>
              </ul>
            </div>
          </div>
        </div>
        {/* PAGE CONTENT */}
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
