'use client';

import { create } from 'zustand';
import type { ChatMessage, PrivateGameState, RoomInfo } from '@tien-len/shared';

interface GameStore {
  room: RoomInfo | null;
  qrDataUrl: string | null;
  game: PrivateGameState | null;
  chat: ChatMessage[];
  selectedCardIds: string[];
  setRoom: (room: RoomInfo | null) => void;
  setQrDataUrl: (url: string | null) => void;
  setGame: (game: PrivateGameState | null) => void;
  addChat: (message: ChatMessage) => void;
  toggleCard: (cardId: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  qrDataUrl: null,
  game: null,
  chat: [],
  selectedCardIds: [],
  setRoom: (room) => set({ room }),
  setQrDataUrl: (qrDataUrl) => set({ qrDataUrl }),
  setGame: (game) => set({ game }),
  addChat: (message) => set({ chat: [...get().chat.slice(-99), message] }),
  toggleCard: (cardId) => {
    const selected = get().selectedCardIds;
    set({
      selectedCardIds: selected.includes(cardId)
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId],
    });
  },
  clearSelection: () => set({ selectedCardIds: [] }),
  reset: () =>
    set({
      room: null,
      qrDataUrl: null,
      game: null,
      chat: [],
      selectedCardIds: [],
    }),
}));
