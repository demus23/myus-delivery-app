// components/Header.tsx
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
      <Link href="/">🏠 Home</Link>

      {session ? (
        <div>
          <span>👤 {session.user.email}</span>
          <button onClick={() => signOut()} style={{ marginLeft: '1rem' }}>
            Logout
          </button>
        </div>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </header>
  );
}
