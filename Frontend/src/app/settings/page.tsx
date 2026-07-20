'use client';

import { useSettingsStore, type LocaleCode } from '@/lib/settings-store';
import { t } from '@/lib/i18n';

const LOCALE_LABELS: Record<LocaleCode, string> = {
  km: 'ខ្មែរ',
  en: 'English',
};

export default function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const dict = t(locale);

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <div className="panel space-y-6 p-6 md:p-8">
        <h1 className="font-display text-4xl text-gold-300">{dict.settings}</h1>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">{dict.language}</p>
          <div className="flex gap-2">
            {(['km', 'en'] as LocaleCode[]).map((code) => (
              <button
                key={code}
                type="button"
                className={locale === code ? 'btn-primary' : 'btn-secondary'}
                onClick={() => setLocale(code)}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">{dict.darkMode}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>

        <div>
          <p className="mb-2 text-sm text-[var(--muted)]">{dict.sound}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
