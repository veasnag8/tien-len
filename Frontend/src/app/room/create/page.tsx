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
  const playError = useGameStore((s) => s.playError);
  const { createRoom } = useGameSocket();
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [allowFive, setAllowFive] = useState(true);
  const [customCode, setCustomCode] = useState('');
  const [codeError, setCodeError] = useState('');

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

  function handleCodeChange(raw: string) {
    // allow digits and letters only, uppercase, max 6 chars
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCustomCode(cleaned);
    if (cleaned.length > 0 && cleaned.length < 3) {
      setCodeError(locale === 'km' ? 'យ៉ាងតិច ៣ តួ' : 'Minimum 3 characters');
    } else {
      setCodeError('');
    }
  }

  function handleCreate() {
    if (customCode && customCode.length < 3) {
      setCodeError(locale === 'km' ? 'យ៉ាងតិច ៣ តួ' : 'Minimum 3 characters');
      return;
    }
    createRoom({
      maxPlayers,
      allowFiveConsecutivePairs: allowFive,
      isPrivate: false,
      customCode: customCode || undefined,
    });
  }

  return (
    <div className="page-pad mx-auto max-w-lg">
      <div className="panel p-5 sm:p-8">
        <h1 className="font-display mb-6 text-3xl text-gold-300 sm:text-4xl">{dict.createRoom}</h1>

        {/* Room code */}
        <label className="mb-1.5 block text-sm text-[var(--muted)]">
          {locale === 'km' ? 'លេខបន្ទប់ (ស្រេចចិត្ត)' : 'Room code (optional)'}
        </label>
        <div className="mb-1 flex gap-2">
          <input
            type="text"
            inputMode="text"
            placeholder={locale === 'km' ? 'ឧ. 123 ឬ ABC123' : 'e.g. 123 or ABC123'}
            value={customCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            maxLength={6}
            className="input-field flex-1 font-mono tracking-widest uppercase"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
          />
          {customCode && (
            <button
              type="button"
              onClick={() => { setCustomCode(''); setCodeError(''); }}
              className="btn-ghost shrink-0 text-sm"
            >
              ✕
            </button>
          )}
        </div>
        <p className={`mb-5 text-xs ${codeError ? 'text-rose-400' : 'text-[var(--muted)]'}`}>
          {codeError || (locale === 'km'
            ? '៣–៦ តួអក្សរ ឬ លេខ។ ទុកទំនេរ = បង្កើតដោយស្វ័យប្រវត្តិ'
            : '3–6 letters or digits. Leave empty to auto-generate.')}
        </p>

        {/* Player count */}
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

        {/* Server error (e.g. code taken) */}
        {playError && (
          <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
            {playError}
          </p>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleCreate}
          disabled={Boolean(codeError)}
        >
          {dict.createRoom}
        </button>
      </div>
    </div>
  );
}
