'use client';

import { useEffect, useState } from 'react';

export function useCountdown(deadline: number | null): number | null {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setSeconds(null);
      return;
    }

    const tick = () => {
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  return seconds;
}
