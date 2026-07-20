'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

export default function JoinRoomPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const room = useGameStore((s) => s.room);
  const { joinRoom } = useGameSocket();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (room?.code) {
      router.push(`/room/${room.code}`);
    }
  }, [room, router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    joinRoom(code.trim().toUpperCase());
  }

  if (loading || !user) {
    return <p className="p-10 text-center">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <form className="panel space-y-4 p-6 md:p-8" onSubmit={onSubmit}>
        <h1 className="font-display text-4xl text-gold-300">{dict.joinRoom}</h1>
        <input
          className="w-full rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3 uppercase tracking-widest"
          placeholder={dict.roomCode}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          required
        />
        <button type="submit" className="btn-primary w-full">
          {dict.joinRoom}
        </button>
      </form>
    </div>
  );
}
