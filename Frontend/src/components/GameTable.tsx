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

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-felt-radial p-4 md:p-8">
      <ConfettiBurst active={Boolean(finished && iWon)} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            Round {game.roundNumber} · {room.code}
          </p>
          <h2 className="font-display text-3xl text-gold-300">
            {finished ? dict.winner : isMyTurn ? dict.yourTurn : dict.brand}
          </h2>
        </div>
        {secondsLeft !== null && game.phase === 'playing' && (
          <div className="rounded-full border border-gold-500/40 px-4 py-2 text-gold-300">
            {secondsLeft}s
          </div>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {opponents.map((p) => {
          const info = room.players.find((r) => r.userId === p.userId);
          return (
            <div key={p.userId} className="panel p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{info?.nickname ?? 'Player'}</span>
                <span className="text-[var(--muted)]">{p.handCount} cards</span>
              </div>
              <div className="flex -space-x-8 overflow-hidden">
                {Array.from({ length: Math.min(p.handCount, 8) }).map((_, i) => (
                  <CardBack key={i} compact />
                ))}
              </div>
              {p.placement && (
                <p className="mt-2 text-gold-300">#{p.placement}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-8 flex min-h-32 flex-wrap items-center justify-center gap-2">
        <AnimatePresence>
          {game.pile.slice(-8).map((card) => (
            <motion.div
              key={`${card.id}-${game.pile.length}`}
              initial={{ y: 40, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PlayingCard card={card} disabled compact />
            </motion.div>
          ))}
        </AnimatePresence>
        {game.pile.length === 0 && (
          <p className="text-[var(--muted)]">Free play — lead any combination</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {game.hand.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.03 }}
          >
            <PlayingCard
              card={card}
              selected={selectedCardIds.includes(card.id)}
              disabled={!isMyTurn}
              onClick={() => isMyTurn && toggleCard(card.id)}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {game.phase === 'playing' ? (
          <>
            <button type="button" className="btn-primary" disabled={!isMyTurn} onClick={onPlay}>
              {dict.playCards}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={!isMyTurn || !game.currentCombination}
              onClick={onPass}
            >
              {dict.pass}
            </button>
          </>
        ) : (
          <button type="button" className="btn-primary" onClick={onPlayAgain}>
            {dict.playAgain}
          </button>
        )}
      </div>

      {finished && (
        <div className="mt-6 panel p-4">
          <h3 className="mb-2 font-display text-2xl text-gold-300">Rankings</h3>
          <ol className="space-y-1">
            {game.rankings.map((uid, i) => {
              const info = room.players.find((p) => p.userId === uid);
              return (
                <li key={uid}>
                  #{i + 1} {info?.nickname ?? uid}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
