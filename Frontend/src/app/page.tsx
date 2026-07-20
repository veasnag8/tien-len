'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ensureGuestSession, getSavedPlayerName } from '@/lib/guest-session';
import { t } from '@/lib/i18n';

export default function HomePage() {
  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const room = useGameStore((s) => s.room);
  const { createRoom, joinRoom } = useGameSocket();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNickname(getSavedPlayerName());
  }, []);

  useEffect(() => {
    if (room?.code) {
      router.push(`/room/${room.code}`);
    }
  }, [room, router]);

  async function onCreate() {
    const name = nickname.trim();
    if (name.length < 2) {
      setError(dict.nicknameRequired);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ensureGuestSession(name);
      createRoom({ maxPlayers: 4, allowFiveConsecutivePairs: true, isPrivate: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    const code = roomCode.trim().toUpperCase();
    if (name.length < 2) {
      setError(dict.nicknameRequired);
      return;
    }
    if (!code) {
      setError(dict.roomCodeRequired);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ensureGuestSession(name);
      joinRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setLoading(false);
    }
  }

  return (
    <section className="page-pad mx-auto flex min-h-[calc(100dvh-var(--header-h)-var(--mobile-nav-h))] max-w-lg flex-col justify-center">
      <p className="mb-2 text-xs tracking-[0.2em] text-gold-400">{dict.brandKh}</p>
      <h1 className="font-display text-4xl text-gold-300 sm:text-5xl">{dict.brand}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{dict.liteTagline}</p>

      <div className="panel mt-8 space-y-4 p-5 sm:p-6">
        <div>
          <label className="mb-2 block text-sm text-[var(--muted)]">{dict.yourName}</label>
          <input
            className="input-field"
            placeholder={dict.enterNickname}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            minLength={2}
            maxLength={24}
            autoFocus
          />
        </div>

        {!showJoin ? (
          <div className="grid gap-3">
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void onCreate()}>
              {dict.createRoom}
            </button>
            <button type="button" className="btn-secondary w-full" onClick={() => setShowJoin(true)}>
              {dict.joinRoom}
            </button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => void onJoin(e)}>
            <input
              className="input-field uppercase tracking-widest"
              placeholder={dict.roomCode}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={8}
              required
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {dict.confirmJoin}
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setShowJoin(false)}>
              ← {dict.createRoom}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
