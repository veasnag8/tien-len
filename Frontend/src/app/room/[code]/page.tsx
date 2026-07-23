'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { useGameSocket, ensureGameSocket } from '@/lib/use-game-socket';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';
import { api } from '@/lib/api';
import { RoomChat } from '@/components/RoomChat';
import { MobileChatSheet } from '@/components/MobileChatSheet';
import { GameTable } from '@/components/GameTable';
import { LITE_MODE } from '@/lib/config';
import { ensureGuestSession, getSavedPlayerName } from '@/lib/guest-session';
import { explainPlayFailure } from '@/lib/play-errors';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const room = useGameStore((s) => s.room);
  const qrDataUrl = useGameStore((s) => s.qrDataUrl);
  const game = useGameStore((s) => s.game);
  const chat = useGameStore((s) => s.chat);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const { joinRoom, reconnect, requestGameState, checkTimeout, setReady, startGame, kick, transferHost, closeRoom, playCards, pass, playAgain, sendChat } =
    useGameSocket();

  const setRoom = useGameStore((s) => s.setRoom);
  const setGame = useGameStore((s) => s.setGame);
  const syncedRef = useRef<string | null>(null);
  const recoveryAttemptedRef = useRef(false);

  const alreadyInRoom = Boolean(
    user && room?.code === code && room.players.some((p) => p.userId === user.id),
  );

  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (room?.status === 'playing' || room?.status === 'finished' || game) {
      setStarting(false);
    }
  }, [room?.status, game]);

  // Only reset when navigating to a different room code — never on every room socket update
  useEffect(() => {
    syncedRef.current = null;
    recoveryAttemptedRef.current = false;
    setGame(null);
    setSyncTimedOut(false);
    setJoined(false);
    setStarting(false);
  }, [code, setGame]);

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user?.nickname]);

  useEffect(() => {
    if (!LITE_MODE && !loading && !user) {
      router.replace(`/auth?next=${encodeURIComponent(`/room/${code ?? ''}`)}`);
    }
  }, [code, loading, router, user]);

  useEffect(() => {
    if (!LITE_MODE || !code || joined) {
      return;
    }
    const saved = getSavedPlayerName();
    if (saved.length >= 2) {
      setNickname(saved);
      void ensureGuestSession(saved)
        .then(() => {
          setJoined(true);
          joinRoom(code);
        })
        .catch(() => undefined);
    }
  }, [code, joined, joinRoom]);

  useEffect(() => {
    if (alreadyInRoom) {
      setJoined(true);
    }
  }, [alreadyInRoom]);

  useEffect(() => {
    if (!user || !code || !joined) {
      return;
    }
    if (syncedRef.current === code) {
      return;
    }
    syncedRef.current = code;
    ensureGameSocket();
    void api.getRoom(code).then((fresh) => setRoom(fresh)).catch(() => undefined);
    joinRoom(code);
    reconnect(code);
  }, [code, joinRoom, joined, reconnect, setRoom, user]);

  // Live lobby fallback: poll room while waiting (covers flaky WebSocket on free hosts)
  useEffect(() => {
    if (!joined || !code || !user) {
      return;
    }
    if (room?.status === 'playing' || room?.status === 'finished') {
      return;
    }
    const tick = () => {
      void api
        .getRoom(code)
        .then((fresh) => {
          const current = useGameStore.getState().room;
          if (
            !current ||
            current.players.length !== fresh.players.length ||
            current.status !== fresh.status ||
            current.players.some((p, i) => p.isReady !== fresh.players[i]?.isReady)
          ) {
            setRoom(fresh);
          }
        })
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [code, joined, room?.status, setRoom, user]);

  useEffect(() => {
    if (!joined || !code || room?.status !== 'playing' || game) {
      return;
    }
    const timer = window.setTimeout(() => requestGameState(), 400);
    return () => window.clearTimeout(timer);
  }, [code, game, joined, requestGameState, room?.status]);

  useEffect(() => {
    if (!joined || !code || !room) {
      return;
    }
    if (room.status !== 'playing' && room.status !== 'finished') {
      recoveryAttemptedRef.current = false;
      setSyncTimedOut(false);
      return;
    }
    if (game) {
      recoveryAttemptedRef.current = false;
      setSyncTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (recoveryAttemptedRef.current) {
        setSyncTimedOut(true);
        return;
      }
      recoveryAttemptedRef.current = true;
      void api
        .getRoom(code)
        .then((fresh) => {
          setRoom(fresh);
          if (fresh.status === 'waiting') {
            setGame(null);
            setSyncTimedOut(false);
            recoveryAttemptedRef.current = false;
            return;
          }
          reconnect(code);
          joinRoom(code);
          requestGameState();
          window.setTimeout(() => setSyncTimedOut(true), 2000);
        })
        .catch(() => setSyncTimedOut(true));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [code, game, joinRoom, joined, reconnect, requestGameState, room, setGame, setRoom]);

  useEffect(() => {
    if (room?.status === 'waiting') {
      setGame(null);
      setSyncTimedOut(false);
      recoveryAttemptedRef.current = false;
    }
  }, [room?.status, setGame]);

  const isHost = room?.hostId === user?.id;
  const me = room?.players.find((p) => p.userId === user?.id);
  const canStart = useMemo(() => {
    if (!room || !isHost) {
      return false;
    }
    if (room.players.length < 2) {
      return false;
    }
    return room.players.every((p) => p.isReady || p.userId === room.hostId);
  }, [isHost, room]);

  async function onConfirmJoin(e: FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (!name || name.length < 2) {
      setError(dict.nicknameRequired);
      return;
    }
    if (!code) {
      setError(dict.roomCodeRequired);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await ensureGuestSession(name);
      setJoined(true);
      setGame(null);
      syncedRef.current = null;
      recoveryAttemptedRef.current = false;
      joinRoom(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!room) {
      return;
    }
    const url = room.inviteUrl.startsWith('http')
      ? room.inviteUrl
      : `${window.location.origin}${room.inviteUrl}`;
    await navigator.clipboard.writeText(url);
  }

  function downloadQr() {
    if (!qrDataUrl) {
      return;
    }
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `tien-len-room-${room?.code ?? 'invite'}.png`;
    a.click();
  }

  function playSelected() {
    if (!game) {
      return;
    }
    const userId = user?.id;
    if (!userId) {
      return;
    }
    const cards = game.hand.filter((c) => selectedCardIds.includes(c.id));
    if (cards.length === 0) {
      return;
    }
    const reason = explainPlayFailure(
      cards,
      game.currentCombination,
      game.allowFiveConsecutivePairs,
      dict,
    );
    if (reason) {
      useGameStore.getState().setPlayError(reason);
      return;
    }
    // Remove from hand instantly — no jump-back while waiting for socket
    useGameStore.getState().applyOptimisticPlay(userId, cards);
    playCards(cards);
  }

  if ((!LITE_MODE && (loading || !user)) || (LITE_MODE && loading && !joined)) {
    return <p className="p-10 text-center">{dict.waiting}</p>;
  }

  if (!joined && !alreadyInRoom) {
    return (
      <div className="page-pad mx-auto max-w-lg">
        <form className="panel space-y-4 p-5 sm:p-8" onSubmit={(e) => void onConfirmJoin(e)}>
          <h1 className="font-display text-3xl text-gold-300 sm:text-4xl">{dict.joinRoom}</h1>
          <p className="text-sm text-[var(--muted)]">{dict.joinGateHint}</p>
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">{dict.roomCode}</label>
            <input
              className="input-field uppercase tracking-widest"
              value={code ?? ''}
              readOnly
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[var(--muted)]">{dict.nickname}</label>
            <input
              className="input-field"
              placeholder={dict.enterNickname}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={2}
              maxLength={24}
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {dict.confirmJoin}
          </button>
        </form>
      </div>
    );
  }

  if (!room) {
    return <p className="p-10 text-center">{dict.waiting}</p>;
  }

  if (room.status === 'playing' || room.status === 'finished') {
    if (!game) {
      return (
        <div className="mx-auto max-w-lg px-5 py-12 text-center">
          <p className="text-[var(--muted)]">
            {syncTimedOut ? dict.sessionExpired : dict.syncingGame}
          </p>
          {syncTimedOut && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => {
                setGame(null);
                setSyncTimedOut(false);
                recoveryAttemptedRef.current = false;
                syncedRef.current = null;
                if (code) {
                  void api.getRoom(code).then((fresh) => setRoom(fresh));
                  playAgain();
                  reconnect(code);
                  joinRoom(code);
                }
              }}
            >
              {dict.backToLobby}
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-10 md:relative md:inset-auto md:mx-auto md:max-w-7xl md:px-4 md:py-4 lg:grid lg:grid-cols-[1fr_280px] lg:gap-4">
        <GameTable
          room={room}
          game={game}
          onPlay={playSelected}
          onPass={() => pass()}
          onPlayAgain={() => playAgain()}
          onTimeoutCheck={checkTimeout}
        />
        <div className="hidden lg:block">
          <RoomChat messages={chat} onSend={sendChat} />
        </div>
        <div className="md:hidden">
          <MobileChatSheet messages={chat} onSend={sendChat} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-pad mx-auto max-w-6xl space-y-4 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-6 lg:space-y-0">
      <div className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">{dict.roomCode}</p>
            <h1 className="font-display text-3xl tracking-wider text-gold-300 sm:text-4xl">{room.code}</h1>
            <p className="mt-1 text-sm text-gold-400/90">
              {dict.playersCount.replace('{current}', String(room.players.length)).replace('{max}', String(room.settings.maxPlayers))}
            </p>
          </div>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Room QR"
              className="h-24 w-24 rounded-2xl border border-[var(--border)] bg-white p-1.5 sm:h-32 sm:w-32"
            />
          )}
        </div>
        <p className="mt-2 break-all text-xs text-[var(--muted)] sm:text-sm">{room.inviteUrl}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" className="btn-secondary !min-h-[44px] text-sm" onClick={() => void copyLink()}>
            {dict.copyLink}
          </button>
          <button
            type="button"
            className="btn-secondary !min-h-[44px] text-sm"
            onClick={downloadQr}
            disabled={!qrDataUrl}
          >
            {dict.downloadQr}
          </button>
          {isHost && (
            <button type="button" className="btn-secondary col-span-2 !min-h-[44px] text-sm sm:col-span-1" onClick={() => closeRoom()}>
              {dict.closeRoom}
            </button>
          )}
        </div>

        <h2 className="mt-6 mb-3 font-display text-xl text-gold-300 sm:text-2xl">{dict.players}</h2>
        {room.players.length < 2 && (
          <p className="mb-3 text-sm text-[var(--muted)]">{dict.startMinPlayers}</p>
        )}
        <div className="space-y-2 sm:space-y-3">
          {room.players.map((p) => (
            <div
              key={p.userId}
              className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-black/20 px-3 py-3 sm:px-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-felt-700 text-sm font-bold text-gold-300">
                  {p.nickname.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {p.nickname} {p.isHost ? `· ${dict.host}` : ''}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {p.isReady ? dict.readyStatus : dict.notReady} ·{' '}
                    {p.isConnected ? dict.online : dict.offline}
                  </p>
                </div>
              </div>
              {isHost && p.userId !== user?.id && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn-ghost !min-h-[36px] !px-2 text-xs"
                    onClick={() => kick(p.userId)}
                  >
                    {dict.kick}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !min-h-[36px] !px-2 text-xs"
                    onClick={() => transferHost(p.userId)}
                  >
                    Host
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sticky bottom-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom)+0.5rem)] mt-6 flex gap-3 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pb-2 pt-4 md:static md:bg-transparent md:p-0">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setReady(!me?.isReady)}
          >
            {me?.isReady ? dict.unready : dict.ready}
          </button>
          {isHost && (
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!canStart || starting}
              onClick={() => {
                setStarting(true);
                startGame();
              }}
            >
              {starting ? dict.startingGame : dict.startGame}
            </button>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <RoomChat messages={chat} onSend={sendChat} />
      </div>
      <MobileChatSheet messages={chat} onSend={sendChat} />
    </div>
  );
}
