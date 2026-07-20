'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

export function SiteHeader() {
  const user = useAuthStore((s) => s.user);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const dict = t(locale);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-4 md:px-10">
      <Link href="/" className="font-display text-2xl tracking-wide text-gold-300 md:text-3xl">
        {dict.brand}
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-2 text-sm md:gap-3">
        <div className="mr-1 flex overflow-hidden rounded-xl border border-[var(--border)]">
          <button
            type="button"
            className={`px-3 py-2 ${locale === 'km' ? 'bg-gold-500 text-ink-900' : 'bg-transparent text-[var(--muted)]'}`}
            onClick={() => setLocale('km')}
          >
            ខ្មែរ
          </button>
          <button
            type="button"
            className={`px-3 py-2 ${locale === 'en' ? 'bg-gold-500 text-ink-900' : 'bg-transparent text-[var(--muted)]'}`}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
        </div>
        <Link className="btn-secondary !px-3 !py-2" href="/play">
          {dict.play}
        </Link>
        <Link className="btn-secondary !px-3 !py-2" href="/leaderboard">
          {dict.leaderboard}
        </Link>
        <Link className="btn-secondary !px-3 !py-2" href="/settings">
          {dict.settings}
        </Link>
        {user ? (
          <Link className="btn-primary !px-3 !py-2" href="/profile">
            {user.nickname}
          </Link>
        ) : (
          <Link className="btn-primary !px-3 !py-2" href="/auth">
            {dict.login}
          </Link>
        )}
      </nav>
    </header>
  );
}
