'use client';

import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const inActiveGame =
    pathname.startsWith('/room/') &&
    pathname !== '/room/create' &&
    pathname !== '/room/join';

  return (
    <main className={inActiveGame ? 'app-shell-game relative z-10' : 'app-shell relative z-10'}>
      {children}
    </main>
  );
}
