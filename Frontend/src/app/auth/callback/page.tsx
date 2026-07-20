'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const token = params.get('accessToken');
    if (!token) {
      router.replace('/auth');
      return;
    }
    api.setToken(token);
    void api.me().then(({ user }) => {
      setUser(user);
      router.replace('/play');
    });
  }, [params, router, setUser]);

  return <p className="p-10 text-center text-[var(--muted)]">Signing you in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center">Loading…</p>}>
      <CallbackInner />
    </Suspense>
  );
}
