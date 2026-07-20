'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

export default function PlayPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  useEffect(() => {
    if (LITE_MODE) {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!LITE_MODE && !loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  if (LITE_MODE) {
    return null;
  }

  if (loading || !user) {
    return <p className="p-10 text-center text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div className="page-pad mx-auto max-w-3xl">
      <h1 className="font-display mb-2 text-4xl text-gold-300 sm:text-5xl">{dict.play}</h1>
      <p className="mb-6 text-[var(--muted)]">Welcome, {user.nickname}</p>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <Link href="/room/create" className="panel flex min-h-[120px] flex-col justify-center p-5 transition active:scale-[0.99] sm:p-6">
          <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">{dict.createRoom}</h2>
        </Link>
        <Link href="/room/join" className="panel flex min-h-[120px] flex-col justify-center p-5 transition active:scale-[0.99] sm:p-6">
          <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">{dict.joinRoom}</h2>
        </Link>
      </div>
    </div>
  );
}
