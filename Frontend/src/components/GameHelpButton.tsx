'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

/** Floating ! help — rules + language (replaces header chrome during play). */
export function GameHelpButton() {
  const [open, setOpen] = useState(false);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const dict = t(locale);

  return (
    <>
      <button
        type="button"
        className="absolute bottom-2 left-2 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/40 bg-black/55 text-base font-bold text-amber-200 shadow-lg backdrop-blur sm:bottom-3 sm:left-3"
        aria-label={dict.rulesTitle}
        onClick={() => setOpen(true)}
      >
        !
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-[#0a1f1c] p-5 text-sm text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="font-display text-xl text-amber-300">{dict.rulesTitle}</h2>
              <button type="button" className="btn-ghost !min-h-8 !px-2 text-white/70" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs text-white/60">{dict.language}</p>
              <div className="flex overflow-hidden rounded-xl border border-white/20 text-sm">
                <button
                  type="button"
                  className={`min-h-10 flex-1 px-3 ${locale === 'km' ? 'bg-amber-400 text-ink-900' : 'bg-transparent text-white/70'}`}
                  onClick={() => setLocale('km')}
                >
                  ខ្មែរ
                </button>
                <button
                  type="button"
                  className={`min-h-10 flex-1 px-3 ${locale === 'en' ? 'bg-amber-400 text-ink-900' : 'bg-transparent text-white/70'}`}
                  onClick={() => setLocale('en')}
                >
                  EN
                </button>
              </div>
            </div>

            <ul className="space-y-2.5 text-[13px] leading-relaxed text-white/90">
              <li>• {dict.rule1}</li>
              <li>• {dict.rule2}</li>
              <li>• {dict.rule3}</li>
              <li>• {dict.rule4}</li>
              <li>• {dict.rule5}</li>
              <li>• {dict.rule6}</li>
              <li>• {dict.rule7}</li>
              <li>• {dict.rule8}</li>
              <li>• {dict.ruleSuit}</li>
              <li>• {dict.rulePoints}</li>
            </ul>

            <button type="button" className="btn-primary mt-5 w-full" onClick={() => setOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
