'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import type { PrivateGameState, RoomInfo } from '@tien-len/shared';
import { PlayingCard, CardBack } from './PlayingCard';
import { ConfettiBurst } from './ConfettiBurst';
import { GameHelpButton } from './GameHelpButton';
import { useAuthStore } from '@/lib/auth-store';
import { useGameStore } from '@/lib/game-store';
import { useSettingsStore } from '@/lib/settings-store';
import { useCountdown } from '@/lib/use-countdown';
import { t } from '@/lib/i18n';

interface GameTableProps {
  room: RoomInfo;
  game: PrivateGameState;
  onPlay: () => void;
  onPass: () => void;
  onPlayAgain: () => void;
  onTimeoutCheck?: () => void;
}

type SeatSlot = 'top' | 'left' | 'right';

function relativeSlot(relativeIndex: number, playerCount: number): SeatSlot | null {
  // relativeIndex 1..n-1 with me at 0 (bottom)
  if (playerCount === 2) {
    return relativeIndex === 1 ? 'top' : null;
  }
  if (playerCount === 3) {
    if (relativeIndex === 1) return 'left';
    if (relativeIndex === 2) return 'right';
    return null;
  }
  // 4 players
  if (relativeIndex === 1) return 'left';
  if (relativeIndex === 2) return 'top';
  if (relativeIndex === 3) return 'right';
  return null;
}

function OpponentFan({
  name,
  handCount,
  isTurn,
  slot,
}: {
  name: string;
  handCount: number;
  isTurn: boolean;
  slot: SeatSlot;
}) {
  const shown = Math.min(handCount, slot === 'top' ? 10 : 8);
  const vertical = slot === 'left' || slot === 'right';

  return (
    <div
      className={`flex items-center gap-2 ${
        slot === 'top' ? 'flex-col' : slot === 'left' ? 'flex-row' : 'flex-row-reverse'
      } ${isTurn ? 'drop-shadow-[0_0_12px_rgba(224,184,74,0.55)]' : ''}`}
    >
      <div className="rounded-lg bg-black/35 px-2 py-1 text-center backdrop-blur-sm">
        <p className="max-w-[5.5rem] truncate text-[11px] font-semibold text-white sm:text-xs">{name}</p>
        <p className="text-[10px] tabular-nums text-emerald-200/90">{handCount}</p>
      </div>
      <div
        className={`relative flex ${vertical ? 'h-[7.5rem] w-12 flex-col items-center' : 'h-14 items-end'}`}
      >
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={
              vertical
                ? {
                    top: `${i * 9}px`,
                    transform: `rotate(${slot === 'left' ? -8 : 8}deg)`,
                    zIndex: i,
                  }
                : {
                    left: `${i * 11}px`,
                    transform: `rotate(${(i - shown / 2) * 2.2}deg)`,
                    zIndex: i,
                  }
            }
          >
            <CardBack mini />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameTable({ room, game, onPlay, onPass, onPlayAgain, onTimeoutCheck }: GameTableProps) {
  const user = useAuthStore((s) => s.user);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const me = game.players.find((p) => p.userId === user?.id);
  const mySeat = me?.seatIndex ?? 0;
  const isMyTurn = me?.seatIndex === game.currentTurnSeat && game.phase === 'playing';
  const secondsLeft = useCountdown(game.turnDeadline);

  // When local timer hits 0, nudge server to auto-pass / advance turn
  useEffect(() => {
    if (secondsLeft !== 0 || game.phase !== 'playing' || !onTimeoutCheck) {
      return;
    }
    onTimeoutCheck();
    const id = window.setTimeout(() => onTimeoutCheck(), 400);
    return () => window.clearTimeout(id);
  }, [secondsLeft, game.phase, game.turnDeadline, onTimeoutCheck]);

  const finished = game.phase === 'finished';
  const iWon = finished && game.rankings[0] === user?.id;
  const handCount = game.hand.length;
  const fanSpread = Math.min(22, Math.max(10, 280 / Math.max(handCount, 1)));

  const seats: Partial<Record<SeatSlot, (typeof game.players)[0]>> = {};
  for (const p of game.players) {
    if (p.userId === user?.id) continue;
    const rel = (p.seatIndex - mySeat + game.playerCount) % game.playerCount;
    const slot = relativeSlot(rel, game.playerCount);
    if (slot) seats[slot] = p;
  }

  const recentPile = game.pile.slice(-8);

  return (
    <div className="game-table relative h-[100dvh] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#0d6b5c_0%,#064e45_45%,#03352f_100%)] md:h-[min(100dvh,820px)] md:rounded-3xl md:border md:border-[var(--border)]">
      <ConfettiBurst active={Boolean(finished && iWon)} />

      {/* Timer chip — top left */}
      <div className="absolute left-2 top-2 z-20 sm:left-4 sm:top-3">
        {secondsLeft !== null && game.phase === 'playing' ? (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums shadow-lg ${
              secondsLeft <= 5
                ? 'animate-pulse border-rose-300 bg-rose-600 text-white'
                : 'border-sky-200/80 bg-gradient-to-b from-sky-500 to-sky-700 text-white'
            }`}
          >
            {secondsLeft}
          </div>
        ) : (
          <div className="rounded-full bg-black/40 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
            {room.code}
          </div>
        )}
      </div>

      <GameHelpButton />

      {/* Scoreboard — top right */}
      <div className="absolute right-2 top-2 z-20 min-w-[7.5rem] rounded-xl border border-white/15 bg-black/45 px-2.5 py-1.5 text-[11px] backdrop-blur-md sm:right-4 sm:top-3 sm:min-w-[9rem] sm:text-xs">
        {game.players
          .slice()
          .sort((a, b) => a.seatIndex - b.seatIndex)
          .map((p) => {
            const info = room.players.find((r) => r.userId === p.userId);
            const name =
              p.userId === user?.id ? dict.youLabel : (info?.nickname ?? 'P');
            const turn = p.seatIndex === game.currentTurnSeat && game.phase === 'playing';
            return (
              <div
                key={p.userId}
                className={`flex items-baseline justify-between gap-2 py-0.5 ${
                  turn ? 'text-amber-300' : 'text-white/90'
                }`}
              >
                <span className="max-w-[4.5rem] truncate font-medium">{name}</span>
                <span className="tabular-nums">
                  <span className="text-sm font-bold sm:text-base">{p.handCount}</span>
                  {p.placement != null && (
                    <span className="ml-1 text-[10px] text-emerald-300">#{p.placement}</span>
                  )}
                </span>
              </div>
            );
          })}
      </div>

      {/* Top opponent */}
      {seats.top && (
        <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 sm:top-3">
          <OpponentFan
            name={room.players.find((r) => r.userId === seats.top!.userId)?.nickname ?? 'Player'}
            handCount={seats.top.handCount}
            isTurn={seats.top.seatIndex === game.currentTurnSeat && game.phase === 'playing'}
            slot="top"
          />
        </div>
      )}

      {/* Left opponent */}
      {seats.left && (
        <div className="absolute left-1 top-1/2 z-10 -translate-y-1/2 sm:left-3">
          <OpponentFan
            name={room.players.find((r) => r.userId === seats.left!.userId)?.nickname ?? 'Player'}
            handCount={seats.left.handCount}
            isTurn={seats.left.seatIndex === game.currentTurnSeat && game.phase === 'playing'}
            slot="left"
          />
        </div>
      )}

      {/* Right opponent */}
      {seats.right && (
        <div className="absolute right-1 top-1/2 z-10 -translate-y-1/2 sm:right-3">
          <OpponentFan
            name={room.players.find((r) => r.userId === seats.right!.userId)?.nickname ?? 'Player'}
            handCount={seats.right.handCount}
            isTurn={seats.right.seatIndex === game.currentTurnSeat && game.phase === 'playing'}
            slot="right"
          />
        </div>
      )}

      {/* Center table — pile + actions */}
      <div className="absolute inset-0 z-[5] flex items-center justify-center px-16 sm:px-24">
        <div className="flex w-full max-w-xl items-center justify-center gap-3 sm:gap-6">
          {game.phase === 'playing' ? (
            <button
              type="button"
              className="btn-table-play"
              disabled={!isMyTurn || selectedCardIds.length === 0}
              onClick={onPlay}
            >
              {dict.playCards}
            </button>
          ) : (
            <span className="w-20 sm:w-24" />
          )}

          <div className="relative flex min-h-[5.5rem] min-w-[8rem] flex-col items-center justify-center sm:min-h-[6.5rem]">
            <div className="flex flex-wrap items-center justify-center gap-1">
              <AnimatePresence mode="popLayout">
                {recentPile.map((card) => (
                  <motion.div
                    key={`${card.id}-${game.pile.indexOf(card)}`}
                    initial={{ y: 28, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <PlayingCard card={card} disabled mini />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {game.pile.length === 0 && game.phase === 'playing' && (
              <p className="text-center text-[11px] text-emerald-100/70">{dict.freePlay}</p>
            )}
            {isMyTurn && game.phase === 'playing' && (
              <p className="mt-1 text-[10px] font-semibold text-amber-200">{dict.yourTurn}</p>
            )}
          </div>

          {game.phase === 'playing' ? (
            <button
              type="button"
              className="btn-table-pass"
              disabled={!isMyTurn || !game.currentCombination}
              onClick={onPass}
            >
              {dict.pass}
            </button>
          ) : (
            <button type="button" className="btn-table-play !px-4" onClick={onPlayAgain}>
              {dict.playAgain}
            </button>
          )}
        </div>
      </div>

      {/* My hand — bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-3xl justify-center px-2">
          {game.hand.map((card, index) => {
            const selected = selectedCardIds.includes(card.id);
            const center = (handCount - 1) / 2;
            const offset = index - center;
            const rotate = offset * (handCount > 10 ? 2.2 : 3);
            return (
              <motion.div
                key={card.id}
                className="relative shrink-0"
                style={{
                  marginLeft: index === 0 ? 0 : `-${fanSpread * 0.58}px`,
                  zIndex: selected ? 60 : index,
                }}
                animate={{
                  y: selected ? -18 : 0,
                  rotate,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <PlayingCard
                  card={card}
                  selected={selected}
                  disabled={!isMyTurn}
                  mini
                  onClick={() => isMyTurn && toggleCard(card.id)}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {finished && (
        <div className="absolute inset-x-4 bottom-24 z-30 mx-auto max-w-sm rounded-2xl border border-white/20 bg-black/75 p-4 backdrop-blur-md sm:bottom-28">
          {game.winReason === 'four_twos' && (
            <p className="mb-2 text-center text-sm font-semibold text-amber-200">{dict.explodeWin}</p>
          )}
          <h3 className="mb-2 font-display text-lg text-amber-300">{dict.rankings}</h3>
          <ol className="space-y-1 text-sm text-white">
            {game.rankings.map((uid, i) => {
              const info = room.players.find((p) => p.userId === uid);
              return (
                <li key={uid} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/25 text-xs text-amber-200">
                    {i + 1}
                  </span>
                  {info?.nickname ?? uid}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
