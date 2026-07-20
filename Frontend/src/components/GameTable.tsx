'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { PrivateGameState, RoomInfo } from '@tien-len/shared';
import { PlayingCard, CardBack } from './PlayingCard';
import { ConfettiBurst } from './ConfettiBurst';
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
}

function opponentInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function GameTable({ room, game, onPlay, onPass, onPlayAgain }: GameTableProps) {
  const user = useAuthStore((s) => s.user);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);

  const me = game.players.find((p) => p.userId === user?.id);
  const isMyTurn = me?.seatIndex === game.currentTurnSeat && game.phase === 'playing';
  const secondsLeft = useCountdown(game.turnDeadline);

  const opponents = game.players.filter((p) => p.userId !== user?.id);
  const finished = game.phase === 'finished';
  const iWon = finished && game.rankings[0] === user?.id;
  const handCount = game.hand.length;
  const fanSpread = Math.min(28, Math.max(12, 320 / Math.max(handCount, 1)));

  return (
    <div className="relative flex min-h-[calc(100dvh-var(--header-h)-1rem)] flex-col overflow-hidden rounded-none border-0 bg-felt-radial md:min-h-0 md:rounded-3xl md:border md:border-[var(--border)]">
      <ConfettiBurst active={Boolean(finished && iWon)} />

      <div className="flex items-center justify-between gap-2 px-3 pt-3 md:px-6 md:pt-6">
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--muted)] md:text-sm">
            R{game.roundNumber} · {room.code}
          </p>
          <h2 className="font-display truncate text-xl text-gold-300 md:text-3xl">
            {finished ? dict.winner : isMyTurn ? dict.yourTurn : dict.brand}
          </h2>
        </div>
        {secondsLeft !== null && game.phase === 'playing' && (
          <div
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums md:px-4 md:py-2 ${
              secondsLeft <= 5
                ? 'animate-pulse border-crimson/60 bg-crimson/20 text-rose-200'
                : 'border-gold-500/40 text-gold-300'
            }`}
          >
            {secondsLeft}s
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-3 pb-2 md:mt-6 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-6">
        {opponents.map((p) => {
          const info = room.players.find((r) => r.userId === p.userId);
          const name = info?.nickname ?? 'Player';
          const isTheirTurn =
            p.seatIndex === game.currentTurnSeat && game.phase === 'playing';
          return (
            <div
              key={p.userId}
              className={`chip shrink-0 md:block md:rounded-2xl md:p-3 ${isTheirTurn ? 'border-gold-400/60 bg-gold-500/10' : ''}`}
            >
              <div className="flex items-center gap-2 md:mb-2 md:justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-felt-700 text-sm font-bold text-gold-300 md:hidden">
                  {opponentInitial(name)}
                </span>
                <div className="min-w-0 md:flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="text-[10px] text-[var(--muted)] md:text-xs">
                    {p.handCount} {dict.cards}
                  </p>
                </div>
              </div>
              <div className="hidden md:flex md:-space-x-8 md:overflow-hidden">
                {Array.from({ length: Math.min(p.handCount, 8) }).map((_, i) => (
                  <CardBack key={i} compact />
                ))}
              </div>
              {p.placement && (
                <p className="mt-1 text-gold-300 md:mt-2">#{p.placement}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex min-h-[7rem] flex-1 flex-wrap items-center justify-center gap-1.5 px-2 py-4 md:min-h-32 md:gap-2 md:px-6">
        <AnimatePresence>
          {game.pile.slice(-6).map((card) => (
            <motion.div
              key={`${card.id}-${game.pile.length}`}
              initial={{ y: 40, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlayingCard card={card} disabled mini />
            </motion.div>
          ))}
        </AnimatePresence>
        {game.pile.length === 0 && (
          <p className="px-4 text-center text-xs text-[var(--muted)] md:text-sm">{dict.freePlay}</p>
        )}
      </div>

      <div className="relative px-2 pb-28 md:px-4 md:pb-4">
        <div className="mx-auto flex max-w-2xl justify-center">
          {game.hand.map((card, index) => {
            const selected = selectedCardIds.includes(card.id);
            const center = (handCount - 1) / 2;
            const offset = index - center;
            const rotate = offset * (handCount > 10 ? 2.5 : 3.5);
            return (
              <motion.div
                key={card.id}
                className="relative shrink-0"
                style={{
                  marginLeft: index === 0 ? 0 : `-${fanSpread * 0.55}px`,
                  zIndex: selected ? 50 : index,
                }}
                initial={{ y: -60, opacity: 0 }}
                animate={{
                  y: selected ? -22 : 0,
                  opacity: 1,
                  rotate,
                }}
                transition={{ delay: index * 0.02 }}
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

      <div className="game-action-bar md:relative md:mt-2">
        <div className="mx-auto flex max-w-lg gap-3 md:justify-center">
          {game.phase === 'playing' ? (
            <>
              <button
                type="button"
                className="btn-primary min-h-[52px] flex-1 text-lg md:flex-none md:px-8"
                disabled={!isMyTurn || selectedCardIds.length === 0}
                onClick={onPlay}
              >
                {dict.playCards}
                {selectedCardIds.length > 0 && (
                  <span className="ml-2 rounded-full bg-ink-900/25 px-2 py-0.5 text-sm">
                    {selectedCardIds.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="btn-secondary min-h-[52px] flex-1 md:flex-none md:px-8"
                disabled={!isMyTurn || !game.currentCombination}
                onClick={onPass}
              >
                {dict.pass}
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary min-h-[52px] w-full md:w-auto" onClick={onPlayAgain}>
              {dict.playAgain}
            </button>
          )}
        </div>
      </div>

      {finished && (
        <div className="mx-3 mb-4 panel p-4 md:mx-6">
          <h3 className="mb-2 font-display text-xl text-gold-300 md:text-2xl">{dict.rankings}</h3>
          <ol className="space-y-1 text-sm md:text-base">
            {game.rankings.map((uid, i) => {
              const info = room.players.find((p) => p.userId === uid);
              return (
                <li key={uid} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500/20 text-xs text-gold-300">
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
