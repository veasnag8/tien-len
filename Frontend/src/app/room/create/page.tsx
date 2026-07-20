'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { LITE_MODE } from '@/lib/config';
import { t } from '@/lib/i18n';

export default function CreateRoomPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const room = useGameStore((s) => s.room);
  const { createRoom } = useGameSocket();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [allowFive, setAllowFive] = useState(true);

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

  useEffect(() => {
    if (room?.code) {
      router.push(`/room/${room.code}`);
    }
  }, [room, router]);

  if (LITE_MODE) {
    return null;
  }

  if (loading || !user) {
    return <p className="p-10 text-center">Loading…</p>;
  }

  return (
    <div className="page-pad mx-auto max-w-lg">
      <div className="panel p-5 sm:p-8">
        <h1 className="font-display mb-6 text-3xl text-gold-300 sm:text-4xl">{dict.createRoom}</h1>
        <label className="mb-2 block text-sm text-[var(--muted)]">{dict.players}</label>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              className={maxPlayers === n ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setMaxPlayers(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="mb-6 flex items-center gap-3 text-sm">
          <input type="checkbox" checked={allowFive} onChange={(e) => setAllowFive(e.target.checked)} />
          Allow five consecutive pairs
        </label>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() =>
            createRoom({
              maxPlayers,
              allowFiveConsecutivePairs: allowFive,
              isPrivate: false,
            })
          }
        >
          {dict.createRoom}
        </button>
      </div>
    </div>
  );
}
