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
  default: 'playing-card playing-card-default h-28 w-20 text-base',
  compact: 'playing-card playing-card-compact h-20 w-14 text-sm',
  /** Base for phones; short-landscape CSS shrinks further — no sm: upsizing. */
  mini: 'playing-card playing-card-mini h-[3.75rem] w-[2.25rem] text-[10px] min-[900px]:h-[4.5rem] min-[900px]:w-[2.65rem] min-[900px]:text-[11px]',
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
      <span className="absolute left-1 top-0.5 font-bold leading-none min-[900px]:left-1.5 min-[900px]:top-1">
        {formatCard(card)}
      </span>
      <span className="absolute bottom-0.5 right-1 rotate-180 font-bold leading-none min-[900px]:bottom-1 min-[900px]:right-1.5">
        {formatCard(card)}
      </span>
    </motion.button>
  );
}

export function CardBack({ compact, mini }: { compact?: boolean; mini?: boolean }) {
  const size = mini ? sizeClasses.mini : compact ? sizeClasses.compact : sizeClasses.default;
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-xl border-2 border-sky-900/80 shadow-card',
        'bg-gradient-to-br from-sky-600 via-blue-700 to-blue-950',
        size,
      )}
    >
      <div className="m-[2px] flex h-[calc(100%-4px)] items-center justify-center rounded-lg border border-sky-300/25 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_45%),repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_5px,transparent_5px_10px)]">
        <span className="text-[9px] font-bold tracking-wider text-sky-100/80">TL</span>
      </div>
    </div>
  );
}
