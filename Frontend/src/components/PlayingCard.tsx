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
}

export function PlayingCard({
  card,
  selected,
  disabled,
  onClick,
  compact,
}: PlayingCardProps) {
  const red = isRedSuit(card.suit);
  return (
    <motion.button
      type="button"
      layout
      whileHover={disabled ? undefined : { y: -10 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      animate={{ y: selected ? -18 : 0 }}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'relative select-none rounded-xl border shadow-card transition',
        compact ? 'h-20 w-14 text-sm' : 'h-28 w-20 text-base',
        red ? 'border-rose-200 bg-[#fff8f5] text-rose-700' : 'border-slate-200 bg-[#f8fbff] text-slate-900',
        selected && 'ring-2 ring-gold-400',
        disabled && 'cursor-default opacity-90',
      )}
      aria-label={formatCard(card)}
    >
      <span className="absolute left-2 top-1.5 font-semibold leading-none">
        {formatCard(card)}
      </span>
      <span className="absolute bottom-1.5 right-2 rotate-180 font-semibold leading-none">
        {formatCard(card)}
      </span>
    </motion.button>
  );
}

export function CardBack({ compact }: { compact?: boolean }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-felt-700 bg-gradient-to-br from-felt-800 to-felt-950 shadow-card',
        compact ? 'h-20 w-14' : 'h-28 w-20',
      )}
    >
      <div className="m-1.5 h-[calc(100%-0.75rem)] rounded-lg border border-gold-500/30 bg-[repeating-linear-gradient(135deg,rgba(212,160,23,0.15)_0_6px,transparent_6px_12px)]" />
    </div>
  );
}
