'use client';

import { create } from 'zustand';
import type { Card, ChatMessage, ChopTransfer, PrivateGameState, PublicGameState, RoomInfo } from '@tien-len/shared';

interface GameStore {
  room: RoomInfo | null;
  qrDataUrl: string | null;
  game: PrivateGameState | null;
  chat: ChatMessage[];
  selectedCardIds: string[];
  playError: string | null;
  roomExitReason: 'left' | 'kicked' | 'closed' | 'disconnect' | null;
  /** When the next round auto-starts (epoch ms). */
  nextGameAt: number | null;
  /** Latest ការ៉េ chop transfers (for toast). */
  chopTransfers: ChopTransfer[] | null;
  /** Full game snapshot before optimistic play (for rollback). */
  gameBackup: PrivateGameState | null;
  pendingPlayIds: string[];
  setRoom: (room: RoomInfo | null) => void;
  setQrDataUrl: (url: string | null) => void;
  setGame: (game: PrivateGameState | null) => void;
  setNextGameAt: (at: number | null) => void;
  setChopTransfers: (transfers: ChopTransfer[] | null) => void;
  mergePublicGame: (publicState: PublicGameState | PrivateGameState, userId?: string) => boolean;
  addChat: (message: ChatMessage) => void;
  toggleCard: (cardId: string) => void;
  clearSelection: () => void;
  setPlayError: (message: string | null) => void;
  applyOptimisticPlay: (userId: string, cards: Card[]) => void;
  rollbackOptimisticPlay: () => void;
  forceRoomExit: (reason: 'left' | 'kicked' | 'closed' | 'disconnect') => void;
  clearRoomExit: () => void;
  reset: () => void;
}

function cloneGame(game: PrivateGameState): PrivateGameState {
  return {
    ...game,
    hand: [...game.hand],
    pile: [...game.pile],
    passedSeats: [...game.passedSeats],
    rankings: [...game.rankings],
    players: game.players.map((p) => ({ ...p })),
    currentCombination: game.currentCombination
      ? {
          ...game.currentCombination,
          cards: [...game.currentCombination.cards],
          highestCard: { ...game.currentCombination.highestCard },
        }
      : null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  room: null,
  qrDataUrl: null,
  game: null,
  chat: [],
  selectedCardIds: [],
  playError: null,
  roomExitReason: null,
  nextGameAt: null,
  chopTransfers: null,
  gameBackup: null,
  pendingPlayIds: [],
  setRoom: (room) => set({ room }),
  setQrDataUrl: (qrDataUrl) => set({ qrDataUrl }),
  setGame: (game) =>
    set({
      game,
      gameBackup: null,
      pendingPlayIds: [],
      nextGameAt: game?.phase === 'finished' ? get().nextGameAt : null,
    }),
  setNextGameAt: (nextGameAt) => set({ nextGameAt }),
  setChopTransfers: (chopTransfers) => set({ chopTransfers }),
  mergePublicGame: (publicState, userId) => {
    const current = get().game;
    if (!current || !('hand' in current)) {
      return false;
    }
    const pending = new Set(get().pendingPlayIds);
    const hand = current.hand.filter((c) => !pending.has(c.id));
    const me = userId ? publicState.players.find((p) => p.userId === userId) : undefined;
    set({
      game: {
        ...publicState,
        hand,
      } as PrivateGameState,
    });
    // true = need private resync (count drift and no pending play explaining it)
    if (me && me.handCount !== hand.length && pending.size === 0) {
      return true;
    }
    return false;
  },
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
  applyOptimisticPlay: (userId, cards) => {
    const game = get().game;
    if (!game || cards.length === 0) {
      return;
    }
    const ids = new Set(cards.map((c) => c.id));
    set({
      gameBackup: cloneGame(game),
      pendingPlayIds: cards.map((c) => c.id),
      selectedCardIds: [],
      playError: null,
      game: {
        ...game,
        hand: game.hand.filter((c) => !ids.has(c.id)),
        pile: [...game.pile, ...cards],
        players: game.players.map((p) =>
          p.userId === userId
            ? { ...p, handCount: Math.max(0, p.handCount - cards.length) }
            : p,
        ),
      },
    });
  },
  rollbackOptimisticPlay: () => {
    const backup = get().gameBackup;
    if (!backup) {
      set({ gameBackup: null, pendingPlayIds: [] });
      return;
    }
    set({
      game: backup,
      gameBackup: null,
      pendingPlayIds: [],
    });
  },
  forceRoomExit: (reason) =>
    set({
      room: null,
      qrDataUrl: null,
      game: null,
      chat: [],
      selectedCardIds: [],
      playError: null,
      nextGameAt: null,
      chopTransfers: null,
      gameBackup: null,
      pendingPlayIds: [],
      roomExitReason: reason,
    }),
  clearRoomExit: () => set({ roomExitReason: null }),
  reset: () =>
    set({
      room: null,
      qrDataUrl: null,
      game: null,
      chat: [],
      selectedCardIds: [],
      playError: null,
      nextGameAt: null,
      chopTransfers: null,
      gameBackup: null,
      pendingPlayIds: [],
      roomExitReason: null,
    }),
}));
