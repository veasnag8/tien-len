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
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display mb-2 text-5xl text-gold-300">{dict.play}</h1>
      <p className="mb-8 text-[var(--muted)]">Welcome, {user.nickname}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/room/create" className="panel p-6 transition hover:border-gold-400/50">
          <h2 className="font-display text-3xl text-gold-300">{dict.createRoom}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Generate room ID, invite link, and QR code
          </p>
        </Link>
        <Link href="/room/join" className="panel p-6 transition hover:border-gold-400/50">
          <h2 className="font-display text-3xl text-gold-300">{dict.joinRoom}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Join with code, invite link, or QR
          </p>
        </Link>
      </div>
    </div>
  );
}
