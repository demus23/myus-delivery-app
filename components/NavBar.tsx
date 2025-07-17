// components/NavBar.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from './NavBar.module.css';

export default function NavBar() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUserRole(null);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role || 'user');
    } catch {
      setUserRole(null);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <nav className={styles.navbar}>
      <button
        className={styles.hamburger}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
        <Link href="/" className={styles.link} onClick={() => setMenuOpen(false)}>Home</Link>
        <Link href="/mypackages" className={styles.link} onClick={() => setMenuOpen(false)}>My Packages</Link>
        <Link href="/profile" className={styles.link} onClick={() => setMenuOpen(false)}>Profile</Link>
        {userRole === 'admin' && (
          <Link href="/admin" className={styles.link} onClick={() => setMenuOpen(false)}>Admin</Link>
        )}
        <button
          onClick={() => {
            logout();
            setMenuOpen(false);
          }}
          className={styles.logoutButton}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}



