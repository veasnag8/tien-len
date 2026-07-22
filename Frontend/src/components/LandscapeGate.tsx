'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

function isPhonePortrait(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  return narrow && portrait;
}

async function tryLockLandscape(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (orientation?.lock) {
      await orientation.lock('landscape');
    }
  } catch {
    // Browsers often block lock outside fullscreen / gesture — overlay is enough
  }
}

/** Phone: landscape only — show rotate prompt in portrait. */
export function LandscapeGate({ children }: { children: React.ReactNode }) {
  const locale = useSettingsStore((s) => s.locale);
  const dict = t(locale);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const update = () => {
      const next = isPhonePortrait();
      setPortrait(next);
      if (!next) {
        void tryLockLandscape();
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mq.removeEventListener?.('change', update);
    };
  }, []);

  return (
    <>
      {children}
      {portrait && (
        <div
          className="landscape-gate fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--bg)] px-8 text-center"
          role="dialog"
          aria-modal="true"
          aria-label={dict.rotateTitle}
        >
          <div className="landscape-gate-icon flex h-20 w-20 items-center justify-center rounded-3xl border border-gold-500/40 bg-gold-500/10 text-4xl text-gold-300">
            ↻
          </div>
          <h2 className="font-display text-2xl text-gold-300">{dict.rotateTitle}</h2>
          <p className="max-w-xs text-sm text-[var(--muted)]">{dict.rotateHint}</p>
          <button
            type="button"
            className="btn-primary mt-2"
            onClick={() => void tryLockLandscape()}
          >
            {dict.rotateAction}
          </button>
        </div>
      )}
    </>
  );
}
