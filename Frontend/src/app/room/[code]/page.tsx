'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { useGameSocket } from '@/lib/use-game-socket';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';
import { RoomChat } from '@/components/RoomChat';
import { GameTable } from '@/components/GameTable';

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
  const clearSelection = useGameStore((s) => s.clearSelection);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const { joinRoom, reconnect, setReady, startGame, kick, transferHost, closeRoom, playCards, pass, playAgain, sendChat } =
    useGameSocket();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user || !code) {
      return;
    }
    if (!room || room.code !== code) {
      joinRoom(code);
      reconnect(code);
    }
  }, [code, joinRoom, reconnect, room, user]);

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

  async function copyLink() {
    if (!room) {
      return;
    }
    await navigator.clipboard.writeText(room.inviteUrl);
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
    const cards = game.hand.filter((c) => selectedCardIds.includes(c.id));
    if (cards.length === 0) {
      return;
    }
    playCards(cards);
    clearSelection();
  }

  if (loading || !user) {
    return <p className="p-10 text-center">Loading…</p>;
  }

  if (!room) {
    return <p className="p-10 text-center">{dict.waiting}</p>;
  }

  if (room.status === 'playing' || room.status === 'finished') {
    if (!game) {
      return <p className="p-10 text-center">Syncing game…</p>;
    }
    return (
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <GameTable
          room={room}
          game={game}
          onPlay={playSelected}
          onPass={() => pass()}
          onPlayAgain={() => playAgain()}
        />
        <RoomChat messages={chat} onSend={sendChat} />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="panel p-6">
        <h1 className="font-display text-4xl text-gold-300">
          {dict.roomCode}: {room.code}
        </h1>
        <p className="mt-2 break-all text-sm text-[var(--muted)]">{room.inviteUrl}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => void copyLink()}>
            {dict.copyLink}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={downloadQr}
            disabled={!qrDataUrl}
          >
            {dict.downloadQr}
          </button>
          {isHost && (
            <button type="button" className="btn-secondary" onClick={() => closeRoom()}>
              {dict.closeRoom}
            </button>
          )}
        </div>

        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Room QR"
            className="mt-6 h-48 w-48 rounded-xl border border-[var(--border)] bg-white p-2"
          />
        )}

        <h2 className="mt-8 mb-3 font-display text-2xl text-gold-300">{dict.players}</h2>
        <div className="space-y-3">
          {room.players.map((p) => (
            <div
              key={p.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3"
            >
              <div>
                <p className="font-semibold">
                  {p.nickname} {p.isHost ? '· Host' : ''}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {p.country} · {p.isReady ? 'Ready' : 'Not ready'} ·{' '}
                  {p.isConnected ? 'Online' : 'Offline'}
                </p>
              </div>
              {isHost && p.userId !== user.id && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1 text-xs"
                    onClick={() => kick(p.userId)}
                  >
                    {dict.kick}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1 text-xs"
                    onClick={() => transferHost(p.userId)}
                  >
                    {dict.transferHost}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setReady(!me?.isReady)}
          >
            {me?.isReady ? dict.unready : dict.ready}
          </button>
          {isHost && (
            <button
              type="button"
              className="btn-primary"
              disabled={!canStart}
              onClick={() => startGame()}
            >
              {dict.startGame}
            </button>
          )}
        </div>
      </div>

      <RoomChat messages={chat} onSend={sendChat} />
    </div>
  );
}
