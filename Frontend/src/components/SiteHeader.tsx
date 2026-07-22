'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/lib/settings-store';
import { useGameStore } from '@/lib/game-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

export function SiteHeader() {
  const pathname = usePathname();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const roomStatus = useGameStore((s) => s.room?.status);
  const dict = t(locale);

  const inRoom =
    pathname.startsWith('/room/') &&
    pathname !== '/room/create' &&
    pathname !== '/room/join';
  const inGame = roomStatus === 'playing' || roomStatus === 'finished';

  // Hide during match so the table is full-screen (phones often >900px wide in landscape)
  if (inRoom && inGame) {
    return null;
  }

  return (
    <header
      className="site-header fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[rgba(5,13,24,0.88)] backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:h-[var(--header-h)] md:px-10">
        <Link href="/" className="font-display truncate text-xl tracking-wide text-gold-300 md:text-3xl">
          {dict.brand}
        </Link>

        <nav className="flex items-center gap-2 md:gap-3">
          <div className="flex overflow-hidden rounded-xl border border-[var(--border)] text-xs md:text-sm">
            <button
              type="button"
              className={`min-h-[36px] px-2.5 py-1.5 md:px-3 md:py-2 ${locale === 'km' ? 'bg-gold-500 text-ink-900' : 'bg-transparent text-[var(--muted)]'}`}
              onClick={() => setLocale('km')}
            >
              ខ្មែរ
            </button>
            <button
              type="button"
              className={`min-h-[36px] px-2.5 py-1.5 md:px-3 md:py-2 ${locale === 'en' ? 'bg-gold-500 text-ink-900' : 'bg-transparent text-[var(--muted)]'}`}
              onClick={() => setLocale('en')}
            >
              EN
            </button>
          </div>

          {!LITE_MODE && (
            <div className="hidden items-center gap-2 md:flex">
              <Link className="btn-secondary !min-h-[40px] !px-3 !py-2 !text-sm" href="/play">
                {dict.play}
              </Link>
              <Link className="btn-secondary !min-h-[40px] !px-3 !py-2 !text-sm" href="/leaderboard">
                {dict.leaderboard}
              </Link>
              <Link className="btn-secondary !min-h-[40px] !px-3 !py-2 !text-sm" href="/settings">
                {dict.settings}
              </Link>
              <Link className="btn-primary !min-h-[40px] !px-3 !py-2 !text-sm" href="/auth">
                {dict.login}
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
