'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

export default function PlayPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

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
          <p className="mt-2 text-sm text-[var(--muted)]">
            Generate room ID, invite link, and QR code
          </p>
        </Link>
        <Link href="/room/join" className="panel flex min-h-[120px] flex-col justify-center p-5 transition active:scale-[0.99] sm:p-6">
          <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">{dict.joinRoom}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Join with code, invite link, or QR
          </p>
        </Link>
      </div>
    </div>
  );
}
