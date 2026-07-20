'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

const liteTabs = [
  { href: '/', labelKey: 'home' as const, icon: HomeIcon },
  { href: '/settings', labelKey: 'settings' as const, icon: SettingsIcon },
];

const fullTabs: Array<{
  href: string;
  labelKey: 'home' | 'play' | 'leaderboard' | 'profile' | 'login';
  icon: typeof HomeIcon;
  auth?: boolean;
  guest?: boolean;
}> = [
  { href: '/', labelKey: 'home' as const, icon: HomeIcon },
  { href: '/play', labelKey: 'play' as const, icon: PlayIcon },
  { href: '/leaderboard', labelKey: 'leaderboard' as const, icon: TrophyIcon },
  { href: '/profile', labelKey: 'profile' as const, icon: UserIcon, auth: true },
  { href: '/auth', labelKey: 'login' as const, icon: UserIcon, guest: true },
];

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

  const tabs = LITE_MODE
    ? liteTabs
    : fullTabs.filter((tab) => {
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
        {tabs.map((tab) => {
          const active =
            tab.href === '/'
              ? pathname === '/'
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const label = dict[tab.labelKey as keyof typeof dict];
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
