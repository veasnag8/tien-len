'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card, PrivateGameState, RoomInfo } from '@tien-len/shared';
import { GAME_CONSTANTS, pointsForPlacement } from '@tien-len/shared';
import { PlayingCard, CardBack } from './PlayingCard';
import { ConfettiBurst } from './ConfettiBurst';
import { GameHelpButton } from './GameHelpButton';
import { StartCountdown } from './StartCountdown';
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
  revealedHand,
}: {
  name: string;
  handCount: number;
  isTurn: boolean;
  slot: SeatSlot;
  revealedHand?: Card[];
}) {
  const faceUp = Boolean(revealedHand && revealedHand.length > 0);
  const cards = faceUp ? revealedHand! : null;
  const shown = faceUp
    ? Math.min(cards!.length, slot === 'top' ? 13 : 10)
    : Math.min(handCount, slot === 'top' ? 10 : 8);
  const vertical = slot === 'left' || slot === 'right';
  const step = faceUp ? (vertical ? 11 : 14) : vertical ? 9 : 11;

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
        className={`relative flex ${
          vertical
            ? `w-12 flex-col items-center ${faceUp ? 'h-[9.5rem]' : 'h-[7.5rem]'}`
            : `items-end ${faceUp ? 'h-16' : 'h-14'}`
        }`}
        style={!vertical ? { width: `${Math.max(shown * step + 40, 48)}px` } : undefined}
      >
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={faceUp ? cards![i]!.id : i}
            className="absolute"
            style={
              vertical
                ? {
                    top: `${i * step}px`,
                    transform: `rotate(${slot === 'left' ? -8 : 8}deg)`,
                    zIndex: i,
                  }
                : {
                    left: `${i * step}px`,
                    transform: `rotate(${(i - shown / 2) * 2.2}deg)`,
                    zIndex: i,
                  }
            }
          >
            {faceUp ? <PlayingCard card={cards![i]!} mini disabled /> : <CardBack mini />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Latest play in front; previous beaten play dimmed behind. */
function pileLayers(previous: Card[] | undefined, latest: Card[] | undefined, flyingIds: Set<string>) {
  return {
    previous: (previous ?? []).filter((c) => !flyingIds.has(c.id)),
    latest: (latest ?? []).filter((c) => !flyingIds.has(c.id)),
  };
}

export function GameTable({ room, game, onPlay, onPass, onTimeoutCheck }: GameTableProps) {
  const user = useAuthStore((s) => s.user);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const playError = useGameStore((s) => s.playError);
  const nextGameAt = useGameStore((s) => s.nextGameAt);
  const chopTransfers = useGameStore((s) => s.chopTransfers);
  const setPlayError = useGameStore((s) => s.setPlayError);
  const setChopTransfers = useGameStore((s) => s.setChopTransfers);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const me = game.players.find((p) => p.userId === user?.id);
  const mySeat = me?.seatIndex ?? 0;
  const gameKey = `${game.roomId}:${game.roundNumber}`;
  const isFreshDeal = useMemo(
    () =>
      game.pile.length === 0 &&
      game.passedSeats.length === 0 &&
      game.players.every((p) => p.handCount === 13 || (game.winReason === 'four_twos' && p.hasFinished)),
    [game.pile.length, game.passedSeats.length, game.players, game.winReason],
  );
  const [introDoneKey, setIntroDoneKey] = useState<string | null>(null);
  const [flyingCards, setFlyingCards] = useState<Card[] | null>(null);
  const showStartCountdown = isFreshDeal && introDoneKey !== gameKey;
  const onIntroFinished = useCallback(() => {
    setIntroDoneKey(gameKey);
  }, [gameKey]);

  // Auto-hide play error after a few seconds
  useEffect(() => {
    if (!playError) {
      return;
    }
    const id = window.setTimeout(() => setPlayError(null), 4500);
    return () => window.clearTimeout(id);
  }, [playError, setPlayError]);

  const flyingIds = useMemo(
    () => new Set(flyingCards?.map((c) => c.id) ?? []),
    [flyingCards],
  );

  const isMyTurn =
    me?.seatIndex === game.currentTurnSeat && game.phase === 'playing' && !showStartCountdown;
  const livePlay = game.phase === 'playing' && !showStartCountdown;
  const secondsLeft = useCountdown(showStartCountdown ? null : game.turnDeadline);

  const handlePlay = useCallback(() => {
    if (!isMyTurn || selectedCardIds.length === 0 || flyingCards) {
      return;
    }
    const cards = game.hand.filter((c) => selectedCardIds.includes(c.id));
    if (cards.length === 0) {
      return;
    }
    // Animate to table; hand is removed optimistically inside onPlay
    setFlyingCards(cards);
    onPlay();
    // End fly overlay quickly — cards already gone from hand + on pile
    window.setTimeout(() => setFlyingCards(null), 220);
  }, [flyingCards, game.hand, isMyTurn, onPlay, selectedCardIds]);

  // Rejected play → hand restored in store; drop fly overlay
  useEffect(() => {
    if (playError) {
      setFlyingCards(null);
    }
  }, [playError]);

  // When local timer hits 0, nudge server to auto-pass / advance turn
  useEffect(() => {
    if (showStartCountdown || secondsLeft !== 0 || game.phase !== 'playing' || !onTimeoutCheck) {
      return;
    }
    onTimeoutCheck();
    const id = window.setTimeout(() => onTimeoutCheck(), 400);
    return () => window.clearTimeout(id);
  }, [secondsLeft, game.phase, game.turnDeadline, onTimeoutCheck, showStartCountdown]);

  const finished = game.phase === 'finished' && !showStartCountdown;
  const [showWinOverlay, setShowWinOverlay] = useState(false);
  const nextGameSecondsLeft = useCountdown(finished ? nextGameAt : null);
  const iWon = finished && showWinOverlay && game.rankings[0] === user?.id;

  // Fallback if GAME_FINISHED event was missed
  useEffect(() => {
    if (finished && nextGameAt == null) {
      useGameStore.getState().setNextGameAt(Date.now() + GAME_CONSTANTS.AUTO_NEXT_GAME_MS);
    }
  }, [finished, nextGameAt]);

  // Show last winning play first, then rankings overlay
  useEffect(() => {
    if (!finished) {
      setShowWinOverlay(false);
      return;
    }
    const id = window.setTimeout(() => setShowWinOverlay(true), GAME_CONSTANTS.WIN_REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [finished, game.roundNumber]);

  useEffect(() => {
    if (!chopTransfers?.length) {
      return;
    }
    const id = window.setTimeout(() => setChopTransfers(null), 4000);
    return () => window.clearTimeout(id);
  }, [chopTransfers, setChopTransfers]);

  const chopBanner = useMemo(() => {
    if (!chopTransfers?.length) {
      return null;
    }
    const focus =
      chopTransfers.find((t) => t.kind === 'overchop') ??
      chopTransfers.find((t) => t.kind === 'chop') ??
      chopTransfers[0]!;
    const pts = focus.points;
    const attacker =
      room.players.find((p) => p.userId === focus.attackerId)?.nickname ??
      focus.attackerId.slice(0, 6);
    const victim =
      room.players.find((p) => p.userId === focus.victimId)?.nickname ??
      focus.victimId.slice(0, 6);
    return dict.chopToast
      .replace('{attacker}', attacker)
      .replace('{victim}', victim)
      .replaceAll('{pts}', String(pts));
  }, [chopTransfers, dict.chopToast, room.players]);

  // Hand already optimistic-trimmed; also hide any still-flying ids
  const visibleHand = game.hand.filter((c) => !flyingIds.has(c.id));
  const handCount = visibleHand.length;
  const fanSpread = Math.min(22, Math.max(10, 280 / Math.max(handCount, 1)));

  const seats: Partial<Record<SeatSlot, (typeof game.players)[0]>> = {};
  for (const p of game.players) {
    if (p.userId === user?.id) continue;
    const rel = (p.seatIndex - mySeat + game.playerCount) % game.playerCount;
    const slot = relativeSlot(rel, game.playerCount);
    if (slot) seats[slot] = p;
  }

  const { previous: previousPile, latest: latestPile } = useMemo(() => {
    const latest = game.currentCombination?.cards ?? game.pile.slice(-4);
    const previous = game.previousCombination?.cards;
    return pileLayers(previous, latest, flyingIds);
  }, [flyingIds, game.currentCombination?.cards, game.pile, game.previousCombination?.cards]);

  return (
    <div className="game-table relative h-[100dvh] w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#0d6b5c_0%,#064e45_45%,#03352f_100%)] md:h-[min(100dvh,820px)] md:rounded-3xl md:border md:border-[var(--border)]">
      <StartCountdown active={showStartCountdown} goLabel={dict.go} onFinished={onIntroFinished} />
      <ConfettiBurst active={Boolean(showWinOverlay && iWon)} />

      {playError && (
        <div className="absolute inset-x-3 top-14 z-[55] mx-auto max-w-md rounded-xl border border-rose-400/50 bg-rose-950/90 px-3 py-2 text-center text-[12px] leading-snug text-rose-50 shadow-lg backdrop-blur sm:top-16 sm:text-sm">
          {playError}
        </div>
      )}

      {chopBanner && (
        <div className="absolute inset-x-3 top-14 z-[56] mx-auto max-w-md rounded-xl border border-amber-400/50 bg-amber-950/90 px-3 py-2 text-center text-[12px] font-semibold leading-snug text-amber-50 shadow-lg backdrop-blur sm:top-16 sm:text-sm">
          {chopBanner}
        </div>
      )}

      {/* Instant fly-to-table on Play — no network wait */}
      <AnimatePresence>
        {flyingCards && flyingCards.length > 0 && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <div className="flex items-center justify-center gap-1">
              {flyingCards.map((card, i) => {
                const mid = (flyingCards.length - 1) / 2;
                const xFrom = (i - mid) * 16;
                const xTo = (i - mid) * 26;
                return (
                  <motion.div
                    key={`fly-${card.id}`}
                    initial={{ y: 160, x: xFrom, scale: 1.05, opacity: 1, rotate: (i - mid) * 4 }}
                    animate={{ y: 0, x: xTo, scale: 0.92, opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{ zIndex: 10 + i }}
                  >
                    <PlayingCard card={card} mini disabled />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* Timer chip — top left */}
      <div className="absolute left-2 top-2 z-20 sm:left-4 sm:top-3">
        {secondsLeft !== null && livePlay ? (
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
            const turn = p.seatIndex === game.currentTurnSeat && livePlay;
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
            isTurn={seats.top.seatIndex === game.currentTurnSeat && livePlay}
            slot="top"
            revealedHand={seats.top.revealedHand}
          />
        </div>
      )}

      {/* Left opponent */}
      {seats.left && (
        <div className="absolute left-1 top-1/2 z-10 -translate-y-1/2 sm:left-3">
          <OpponentFan
            name={room.players.find((r) => r.userId === seats.left!.userId)?.nickname ?? 'Player'}
            handCount={seats.left.handCount}
            isTurn={seats.left.seatIndex === game.currentTurnSeat && livePlay}
            slot="left"
            revealedHand={seats.left.revealedHand}
          />
        </div>
      )}

      {/* Right opponent */}
      {seats.right && (
        <div className="absolute right-1 top-1/2 z-10 -translate-y-1/2 sm:right-3">
          <OpponentFan
            name={room.players.find((r) => r.userId === seats.right!.userId)?.nickname ?? 'Player'}
            handCount={seats.right.handCount}
            isTurn={seats.right.seatIndex === game.currentTurnSeat && livePlay}
            slot="right"
            revealedHand={seats.right.revealedHand}
          />
        </div>
      )}

      {/* Center table — pile + actions */}
      <div className="absolute inset-0 z-[5] flex items-center justify-center px-16 sm:px-24">
        <div className="flex w-full max-w-xl items-center justify-center gap-3 sm:gap-6">
          {game.phase === 'playing' ? (
            <button
              type="button"
              className={`btn-table-play${isMyTurn ? ' is-active' : ''}`}
              disabled={!isMyTurn || selectedCardIds.length === 0 || Boolean(flyingCards)}
              onClick={handlePlay}
            >
              {dict.playCards}
            </button>
          ) : (
            <span className="w-20 sm:w-24" />
          )}

          <div className="relative flex min-h-[5.5rem] min-w-[8rem] flex-col items-center justify-center sm:min-h-[6.5rem]">
            <div className="relative flex min-h-[4.5rem] min-w-[6rem] items-center justify-center">
              {/* Older play — behind + dimmed */}
              {previousPile.length > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center gap-0.5 opacity-[0.38] blur-[0.4px]"
                  style={{ transform: 'translateY(-10px) scale(0.9)' }}
                  aria-hidden
                >
                  {previousPile.map((card) => (
                    <div key={`old-${card.id}`} className="relative" style={{ marginLeft: -4 }}>
                      <PlayingCard card={card} disabled mini />
                    </div>
                  ))}
                </div>
              )}
              {/* Latest play — front & clear */}
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-1">
                <AnimatePresence mode="popLayout">
                  {latestPile.map((card) => (
                    <motion.div
                      key={`new-${card.id}`}
                      initial={{ y: 48, opacity: 0.85, scale: 0.88 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92, y: -8 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PlayingCard card={card} disabled mini />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
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
              className={`btn-table-pass${isMyTurn && game.currentCombination ? ' is-active' : ''}`}
              disabled={!isMyTurn || !game.currentCombination}
              onClick={onPass}
            >
              {dict.pass}
            </button>
          ) : (
            <span className="w-20 sm:w-24" />
          )}
        </div>
      </div>

      {/* My hand — bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex max-w-3xl justify-center px-2">
          {visibleHand.map((card, index) => {
            const selected = selectedCardIds.includes(card.id);
            const center = (handCount - 1) / 2;
            const offset = index - center;
            const rotate = offset * (handCount > 10 ? 2.2 : 3);
            return (
              <motion.div
                key={card.id}
                layout
                className="relative shrink-0"
                style={{
                  marginLeft: index === 0 ? 0 : `-${fanSpread * 0.58}px`,
                  zIndex: selected ? 60 : index,
                }}
                animate={{
                  y: selected ? -22 : 0,
                  rotate,
                  scale: selected ? 1.04 : 1,
                }}
                transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.6 }}
              >
                <PlayingCard
                  card={card}
                  selected={selected}
                  disabled={!isMyTurn || Boolean(flyingCards)}
                  mini
                  onClick={() => isMyTurn && !flyingCards && toggleCard(card.id)}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {showWinOverlay && (
        <div className="absolute inset-x-4 bottom-24 z-30 mx-auto max-w-sm rounded-2xl border border-white/20 bg-black/75 p-4 backdrop-blur-md sm:bottom-28">
          {game.winReason === 'four_twos' && (
            <p className="mb-2 text-center text-sm font-semibold text-amber-200">{dict.explodeWin}</p>
          )}
          <h3 className="mb-2 font-display text-lg text-amber-300">{dict.rankings}</h3>
          <ol className="space-y-1 text-sm text-white">
            {game.rankings.map((uid, i) => {
              const info = room.players.find((p) => p.userId === uid);
              const pts = pointsForPlacement(game.playerCount, i);
              const ptsLabel = pts > 0 ? `+${pts}` : String(pts);
              return (
                <li key={uid} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-xs text-amber-200">
                      {i + 1}
                    </span>
                    <span className="truncate">{info?.nickname ?? uid}</span>
                  </span>
                  <span
                    className={`shrink-0 tabular-nums text-xs font-semibold ${
                      pts > 0 ? 'text-emerald-300' : pts < 0 ? 'text-rose-300' : 'text-white/60'
                    }`}
                  >
                    {ptsLabel}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-center text-xs font-medium text-amber-200/90">
            {dict.nextGameIn.replace(
              '{n}',
              String(Math.max(0, nextGameSecondsLeft ?? 0)),
            )}
          </p>
        </div>
      )}
    </div>
  );
}
