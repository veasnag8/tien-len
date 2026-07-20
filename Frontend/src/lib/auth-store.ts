'use client';

import { create } from 'zustand';
import type { UserProfile } from '@tien-len/shared';
import { api } from './api';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  hydrate: async () => {
    const token = api.loadToken();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, loading: false });
    } catch {
      api.setToken(null);
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } finally {
      api.setToken(null);
      set({ user: null });
    }
  },
}));
