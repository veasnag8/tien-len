'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

const tabs = [
  { href: '/', labelKey: 'home' as const, icon: HomeIcon },
  { href: '/play', labelKey: 'play' as const, icon: PlayIcon },
  { href: '/leaderboard', labelKey: 'leaderboard' as const, icon: TrophyIcon },
  { href: '/profile', labelKey: 'profile' as const, icon: UserIcon, auth: true },
  { href: '/auth', labelKey: 'login' as const, icon: UserIcon, guest: true },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
    </svg>
  );
}

function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-5.197-3.03A1 1 0 008 9.03v5.94a1 1 0 001.555.832l5.197-3.03a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM5 5H3v1a3 3 0 003 3M19 5h2v1a3 3 0 01-3 3" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const hideOnGame =
    pathname.startsWith('/room/') &&
    pathname.split('/').filter(Boolean).length >= 2 &&
    pathname !== '/room/create' &&
    pathname !== '/room/join';

  if (hideOnGame) {
    return null;
  }

  const visibleTabs = tabs.filter((tab) => {
    if (tab.auth && !user) {
      return false;
    }
    if (tab.guest && user) {
      return false;
    }
    return true;
  });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[rgba(5,13,24,0.92)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1">
        {visibleTabs.map((tab) => {
          const active =
            tab.href === '/'
              ? pathname === '/'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const label =
            tab.labelKey === 'home'
              ? dict.home
              : dict[tab.labelKey as keyof typeof dict];
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex min-h-[52px] min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition',
                active ? 'text-gold-300' : 'text-[var(--muted)]',
              )}
            >
              <Icon active={active} />
              <span className="truncate">{label}</span>
              {active && <span className="h-1 w-1 rounded-full bg-gold-400" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
