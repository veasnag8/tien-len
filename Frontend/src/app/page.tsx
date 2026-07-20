'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ensureGuestSession, getSavedPlayerName } from '@/lib/guest-session';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

export default function HomePage() {
  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const setRoom = useGameStore((s) => s.setRoom);
  const setQr = useGameStore((s) => s.setQrDataUrl);
  const { joinRoom } = useGameSocket();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [showJoin, setShowJoin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNickname(getSavedPlayerName());
  }, []);

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
      const { room, qrDataUrl } = await api.createRoom({
        maxPlayers,
        allowFiveConsecutivePairs: true,
        isPrivate: true,
      });
      setRoom(room);
      setQr(qrDataUrl);
      joinRoom(room.code);
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
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
      const room = await api.joinRoom(code);
      setRoom(room);
      joinRoom(code);
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-pad mx-auto flex min-h-[calc(100dvh-var(--header-h)-var(--mobile-nav-h))] max-w-lg flex-col justify-center">
      <p className="mb-2 text-xs tracking-[0.2em] text-gold-400">{dict.brandKh}</p>
      <h1 className="font-display text-4xl text-gold-300 sm:text-5xl">{dict.brand}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{dict.liteTagline}</p>
      <p className="mt-1 text-xs text-gold-400/80">{dict.playerCountHint}</p>

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
            disabled={loading}
          />
        </div>

        {!showJoin ? (
          <div className="grid gap-3">
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{dict.maxPlayersLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={maxPlayers === n ? 'btn-primary' : 'btn-secondary'}
                    disabled={loading}
                    onClick={() => setMaxPlayers(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={() => void onCreate()}>
              {loading ? dict.waiting : dict.createRoom}
            </button>
            <button type="button" className="btn-secondary w-full" disabled={loading} onClick={() => setShowJoin(true)}>
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
              disabled={loading}
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? dict.waiting : dict.confirmJoin}
            </button>
            <button type="button" className="btn-ghost w-full" disabled={loading} onClick={() => setShowJoin(false)}>
              ← {dict.createRoom}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
