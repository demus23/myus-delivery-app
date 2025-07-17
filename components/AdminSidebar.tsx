import Link from 'next/link';
import { useRouter } from 'next/router';
import { LogOut, Package, Users, LayoutDashboard } from 'lucide-react'; // Lucide for icons

const links = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
  { href: '/admin/packages', label: 'Packages', icon: <Package size={22} /> },
  { href: '/admin/users', label: 'Users', icon: <Users size={22} /> },
];

export default function AdminSidebar() {
  const router = useRouter();

  return (
    <aside
      style={{
        background: '#223356',
        color: '#fff',
        minWidth: 230,
        minHeight: '100vh',
        padding: '38px 0 24px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        boxShadow: '2px 0 20px #22335614',
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: 1.5,
          marginBottom: 36,
          color: '#fff',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#5BD6D1' }}>MyUS</span> Admin
      </div>
      <nav style={{ width: '100%' }}>
        {links.map(link => {
          const isActive = router.pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '15px 32px',
                color: isActive ? '#5BD6D1' : '#fff',
                background: isActive ? '#1a2336' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive ? 900 : 600,
                fontSize: 18,
                borderLeft: isActive ? '6px solid #5BD6D1' : '6px solid transparent',
                marginBottom: 3,
                transition: 'background 0.14s, color 0.15s',
                cursor: 'pointer',
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => {
          localStorage.removeItem('token');
          router.push('/login');
        }}
        style={{
          marginTop: 'auto',
          background: '#fff',
          color: '#223356',
          fontWeight: 700,
          padding: '12px 36px',
          borderRadius: 13,
          fontSize: 18,
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 2px 10px #2b3d5210',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 8,
          marginLeft: 10,
        }}
      >
        <LogOut size={20} /> Logout
      </button>
      <div style={{ fontSize: 13, color: "#fff6", marginTop: 12, marginBottom: 3 }}>
        © {new Date().getFullYear()} MyUS Delivery Admin
      </div>
    </aside>
  );
}
