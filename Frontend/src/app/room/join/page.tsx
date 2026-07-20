'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function JoinRoomPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const room = useGameStore((s) => s.room);
  const { joinRoom } = useGameSocket();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth?next=/room/join');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user?.nickname]);

  useEffect(() => {
    if (room?.code) {
      router.push(`/room/${room.code}`);
    }
  }, [room, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const roomCode = code.trim().toUpperCase();
    const name = nickname.trim();
    if (!roomCode) {
      setError(dict.roomCodeRequired);
      return;
    }
    if (!name || name.length < 2) {
      setError(dict.nicknameRequired);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (!user?.nickname || user.nickname !== name) {
        const updated = await api.updateProfile({ nickname: name });
        setUser(updated);
      }
      joinRoom(roomCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <p className="p-10 text-center">Loading…</p>;
  }

  return (
    <div className="page-pad mx-auto max-w-lg">
      <form className="panel space-y-4 p-5 sm:p-8" onSubmit={(e) => void onSubmit(e)}>
        <h1 className="font-display text-3xl text-gold-300 sm:text-4xl">{dict.joinRoom}</h1>
        <p className="text-sm text-[var(--muted)]">{dict.joinGateHint}</p>
        <input
          className="input-field uppercase tracking-widest"
          placeholder={dict.roomCode}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          required
        />
        <input
          className="input-field"
          placeholder={dict.enterNickname}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          minLength={2}
          maxLength={24}
          required
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {dict.confirmJoin}
        </button>
      </form>
    </div>
  );
}
