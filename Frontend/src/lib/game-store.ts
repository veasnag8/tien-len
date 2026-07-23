'use client';

import { create } from 'zustand';
import type { ChatMessage, PrivateGameState, RoomInfo } from '@tien-len/shared';

interface GameStore {
  room: RoomInfo | null;
  qrDataUrl: string | null;
  game: PrivateGameState | null;
  chat: ChatMessage[];
  selectedCardIds: string[];
  playError: string | null;
  setRoom: (room: RoomInfo | null) => void;
  setQrDataUrl: (url: string | null) => void;
  setGame: (game: PrivateGameState | null) => void;
  addChat: (message: ChatMessage) => void;
  toggleCard: (cardId: string) => void;
  clearSelection: () => void;
  setPlayError: (message: string | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  qrDataUrl: null,
  game: null,
  chat: [],
  selectedCardIds: [],
  playError: null,
  setRoom: (room) => set({ room }),
  setQrDataUrl: (qrDataUrl) => set({ qrDataUrl }),
  setGame: (game) => set({ game, playError: null }),
  addChat: (message) => set({ chat: [...get().chat.slice(-99), message] }),
  toggleCard: (cardId) => {
    const selected = get().selectedCardIds;
    set({
      playError: null,
      selectedCardIds: selected.includes(cardId)
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId],
    });
  },
  clearSelection: () => set({ selectedCardIds: [] }),
  setPlayError: (playError) => set({ playError }),
  reset: () =>
    set({
      room: null,
      qrDataUrl: null,
      game: null,
      chat: [],
      selectedCardIds: [],
      playError: null,
    }),
}));
