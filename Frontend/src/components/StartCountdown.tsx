'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Tick = 3 | 2 | 1 | 'go';

interface StartCountdownProps {
  active: boolean;
  goLabel: string;
  onFinished: () => void;
}

/** Full-screen 3 → 2 → 1 → GO before the first playable moment. */
export function StartCountdown({ active, goLabel, onFinished }: StartCountdownProps) {
  const [tick, setTick] = useState<Tick | null>(null);

  useEffect(() => {
    if (!active) {
      setTick(null);
      return;
    }

    setTick(3);
    const timers = [
      window.setTimeout(() => setTick(2), 900),
      window.setTimeout(() => setTick(1), 1800),
      window.setTimeout(() => setTick('go'), 2700),
      window.setTimeout(() => {
        setTick(null);
        onFinished();
      }, 3400),
    ];

    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
    };
  }, [active, onFinished]);

  return (
    <AnimatePresence>
      {tick != null && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={tick}
              className="font-display text-[clamp(4.5rem,22vw,8rem)] font-bold leading-none text-amber-300 drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
              initial={{ scale: 0.45, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.25, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              {tick === 'go' ? goLabel : tick}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
