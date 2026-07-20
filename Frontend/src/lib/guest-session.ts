'use client';

import { api } from './api';
import { useAuthStore } from './auth-store';

const NAME_KEY = 'playerName';

export function getSavedPlayerName(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function savePlayerName(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(NAME_KEY, name.trim());
}

export async function ensureGuestSession(nickname: string) {
  const name = nickname.trim();
  if (name.length < 2) {
    throw new Error('Nickname required');
  }
  savePlayerName(name);

  const token = api.loadToken();
  const current = useAuthStore.getState().user;
  if (token && current?.nickname === name) {
    return current;
  }

  const result = await api.guest({ nickname: name });
  api.setToken(result.accessToken);
  useAuthStore.getState().setUser(result.user);
  return result.user;
}
