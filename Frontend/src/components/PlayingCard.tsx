'use client';

import { formatCard, isRedSuit, type Card } from '@tien-len/shared';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface PlayingCardProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
  mini?: boolean;
}

const sizeClasses = {
  default: 'h-28 w-20 text-base',
  compact: 'h-20 w-14 text-sm',
  mini: 'h-[4.5rem] w-[2.65rem] text-[11px] sm:h-20 sm:w-14 sm:text-sm',
};

export function PlayingCard({
  card,
  selected,
  disabled,
  onClick,
  compact,
  mini,
}: PlayingCardProps) {
  const red = isRedSuit(card.suit);
  const size = mini ? 'mini' : compact ? 'compact' : 'default';

  return (
    <motion.button
      type="button"
      layout
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative select-none overflow-hidden rounded-xl border shadow-card transition-shadow',
        sizeClasses[size],
        red ? 'border-rose-200 bg-[#fff8f5] text-rose-700' : 'border-slate-200 bg-[#f8fbff] text-slate-900',
        selected && 'shadow-glow ring-2 ring-gold-400',
        disabled && 'cursor-default opacity-95',
      )}
      aria-label={formatCard(card)}
    >
      <span className="pointer-events-none absolute inset-0 bg-card-shine opacity-60" />
      <span className="absolute left-1.5 top-1 font-bold leading-none sm:left-2 sm:top-1.5">
        {formatCard(card)}
      </span>
      <span className="absolute bottom-1 right-1.5 rotate-180 font-bold leading-none sm:bottom-1.5 sm:right-2">
        {formatCard(card)}
      </span>
    </motion.button>
  );
}

export function CardBack({ compact, mini }: { compact?: boolean; mini?: boolean }) {
  const size = mini ? sizeClasses.mini : compact ? sizeClasses.compact : sizeClasses.default;
  return (
    <div className={clsx('rounded-xl border border-felt-700 bg-gradient-to-br from-felt-800 to-felt-950 shadow-card', size)}>
      <div className="m-1 h-[calc(100%-0.5rem)] rounded-lg border border-gold-500/30 bg-[repeating-linear-gradient(135deg,rgba(212,160,23,0.15)_0_6px,transparent_6px_12px)]" />
    </div>
  );
}
