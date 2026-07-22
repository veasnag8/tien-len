'use client';

import { usePathname } from 'next/navigation';
import { useGameStore } from '@/lib/game-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const roomStatus = useGameStore((s) => s.room?.status);
  const inActiveGame =
    pathname.startsWith('/room/') &&
    pathname !== '/room/create' &&
    pathname !== '/room/join';
  const playing = roomStatus === 'playing' || roomStatus === 'finished';

  return (
    <main
      className={
        inActiveGame && playing
          ? 'app-shell-immersive relative z-10'
          : inActiveGame
            ? 'app-shell-game relative z-10'
            : 'app-shell relative z-10'
      }
    >
      {children}
    </main>
  );
}
