// lib/useRequireAuth.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);
}
