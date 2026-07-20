'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function ConfettiBurst({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<Array<{ id: number; x: number; color: string }>>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }
    const colors = ['#d4a017', '#e8c15a', '#4aa97c', '#f5d78e', '#fff'];
    setPieces(
      Array.from({ length: 42 }, (_, id) => ({
        id,
        x: Math.random() * 100,
        color: colors[id % colors.length]!,
      })),
    );
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 h-2 w-2 rounded-sm"
          style={{ left: `${p.x}%`, background: p.color }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0.2, rotate: 360 }}
          transition={{ duration: 2.2 + (p.id % 5) * 0.15, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
