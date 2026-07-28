'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/lib/use-game-socket';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { ensureGuestSession, getSavedPlayerName } from '@/lib/guest-session';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type Mode = 'home' | 'create' | 'join';

export default function HomePage() {
  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const setRoom = useGameStore((s) => s.setRoom);
  const setQr = useGameStore((s) => s.setQrDataUrl);
  const { joinRoom } = useGameSocket();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<Mode>('home');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNickname(getSavedPlayerName());
  }, []);

  function handleCodeChange(raw: string) {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCode(cleaned);
    if (cleaned.length > 0 && cleaned.length < 3) {
      setCodeError(locale === 'km' ? 'យ៉ាងតិច ៣ តួ' : 'Minimum 3 characters');
    } else {
      setCodeError('');
    }
  }

  function openCreate() {
    setError('');
    setCodeError('');
    setRoomCode('');
    setMode('create');
  }

  function openJoin() {
    setError('');
    setCodeError('');
    setRoomCode('');
    setMode('join');
  }

  function backHome() {
    setError('');
    setCodeError('');
    setRoomCode('');
    setMode('home');
  }

  async function onCreate(e: FormEvent) {
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
    if (code.length < 3) {
      setCodeError(locale === 'km' ? 'យ៉ាងតិច ៣ តួ' : 'Minimum 3 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ensureGuestSession(name);
      const { room, qrDataUrl } = await api.createRoom({
        maxPlayers: 4,
        allowFiveConsecutivePairs: true,
        isPrivate: true,
        turnTimeoutMs: 30_000,
        customCode: code,
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
            autoFocus={mode === 'home'}
            disabled={loading}
          />
        </div>

        {mode === 'home' && (
          <div className="grid gap-3">
            <button type="button" className="btn-primary w-full" disabled={loading} onClick={openCreate}>
              {dict.createRoom}
            </button>
            <button type="button" className="btn-secondary w-full" disabled={loading} onClick={openJoin}>
              {dict.joinRoom}
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form className="space-y-3" onSubmit={(e) => void onCreate(e)}>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{dict.roomCode}</label>
              <input
                className="input-field font-mono uppercase tracking-widest"
                placeholder={locale === 'km' ? 'ឧ. 123' : 'e.g. 123'}
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={6}
                inputMode="text"
                autoFocus
                required
                disabled={loading}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <p className={`mt-1.5 text-xs ${codeError ? 'text-rose-400' : 'text-[var(--muted)]'}`}>
                {codeError || dict.roomCodeHint}
              </p>
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || Boolean(codeError) || roomCode.length < 3}
            >
              {loading ? dict.waiting : dict.confirmCreate}
            </button>
            <button type="button" className="btn-ghost w-full" disabled={loading} onClick={backHome}>
              ← {dict.createRoom}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form className="space-y-3" onSubmit={(e) => void onJoin(e)}>
            <div>
              <label className="mb-2 block text-sm text-[var(--muted)]">{dict.roomCode}</label>
              <input
                className="input-field font-mono uppercase tracking-widest"
                placeholder={dict.roomCode}
                value={roomCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={6}
                required
                autoFocus
                disabled={loading}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="characters"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? dict.waiting : dict.confirmJoin}
            </button>
            <button type="button" className="btn-ghost w-full" disabled={loading} onClick={backHome}>
              ← {dict.joinRoom}
            </button>
          </form>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
