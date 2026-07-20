'use client';

import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type LocaleCode = 'en' | 'km';

interface SettingsState {
  theme: ThemeMode;
  locale: LocaleCode;
  soundEnabled: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: LocaleCode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  hydrate: () => void;
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function normalizeLocale(value: string | null): LocaleCode {
  if (value === 'en') {
    return 'en';
  }
  return 'km';
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  locale: 'km',
  soundEnabled: true,
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  setLocale: (locale) => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    set({ locale });
  },
  setSoundEnabled: (soundEnabled) => {
    localStorage.setItem('soundEnabled', String(soundEnabled));
    set({ soundEnabled });
  },
  hydrate: () => {
    const theme = (localStorage.getItem('theme') as ThemeMode | null) ?? 'dark';
    const locale = normalizeLocale(localStorage.getItem('locale'));
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    applyTheme(theme);
    document.documentElement.lang = locale;
    set({ theme, locale, soundEnabled });
  },
}));
