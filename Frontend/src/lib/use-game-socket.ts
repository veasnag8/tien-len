'use client';

import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@tien-len/socket';
import type { Card } from '@tien-len/shared';
import { v4 as uuidv4 } from 'uuid';
import { getWsUrl } from './config';
import { api } from './api';
import { useGameStore } from './game-store';
import { useAuthStore } from './auth-store';
import { sounds } from './sounds';
import { useSettingsStore } from './settings-store';

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
let listenersAttached = false;
let pendingRoomCode: string | null = null;

function emitWhenConnected(socket: Socket, event: string, payload?: unknown): void {
  const emit = () => socket.emit(event, payload);
  if (socket.connected) {
    window.setTimeout(emit, 50);
    return;
  }
  const onConnect = () => {
    socket.off('connect', onConnect);
    window.setTimeout(emit, 50);
  };
  socket.on('connect', onConnect);
  if (!socket.active) {
    socket.connect();
  }
}

function syncPendingRoom(socket: Socket): void {
  if (!pendingRoomCode) {
    return;
  }
  const code = pendingRoomCode;
  emitWhenConnected(socket, SocketEvents.ROOM_JOIN, { code });
  emitWhenConnected(socket, SocketEvents.PLAYER_RECONNECT, { roomCode: code });
}

function identify(socket: Socket, token: string): void {
  emitWhenConnected(socket, SocketEvents.AUTH_IDENTIFY, { token });
}

function attachSocketListeners(socket: Socket): void {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  socket.on('connect', () => {
    const token = api.loadToken();
    if (token) {
      identify(socket, token);
    }
    syncPendingRoom(socket);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] disconnected', reason);
  });

  socket.on('reconnect', () => {
    const token = api.loadToken();
    if (token) {
      identify(socket, token);
    }
    syncPendingRoom(socket);
  });

  socket.on(SocketEvents.AUTH_IDENTIFIED, (payload: { user: import('@tien-len/shared').UserProfile }) => {
    useAuthStore.getState().setUser(payload.user);
  });
  socket.on(SocketEvents.ROOM_CREATED, (payload: {
    room: import('@tien-len/shared').RoomInfo;
    qrDataUrl: string;
  }) => {
    useGameStore.getState().setRoom(payload.room);
    useGameStore.getState().setQrDataUrl(payload.qrDataUrl);
  });
  socket.on(SocketEvents.ROOM_JOINED, (payload: { room: import('@tien-len/shared').RoomInfo }) => {
    useGameStore.getState().setRoom(payload.room);
  });
  socket.on(SocketEvents.ROOM_UPDATE, (payload: { room: import('@tien-len/shared').RoomInfo }) => {
    useGameStore.getState().setRoom(payload.room);
  });
  socket.on(SocketEvents.GAME_PRIVATE_STATE, (payload: {
    state: import('@tien-len/shared').PrivateGameState;
  }) => {
    useGameStore.getState().setGame(payload.state);
    useGameStore.getState().clearSelection();
  });
  socket.on(SocketEvents.GAME_STATE, (payload: {
    state: import('@tien-len/shared').PrivateGameState | import('@tien-len/shared').PublicGameState;
  }) => {
    // Public state only — keep private hand if we already have one
    const current = useGameStore.getState().game;
    if (current && 'hand' in current && Array.isArray(current.hand)) {
      useGameStore.getState().setGame({
        ...payload.state,
        hand: current.hand,
      } as import('@tien-len/shared').PrivateGameState);
    }
  });
  socket.on(SocketEvents.CHAT_MESSAGE, (payload: { message: import('@tien-len/shared').ChatMessage }) => {
    useGameStore.getState().addChat(payload.message);
  });
  socket.on(SocketEvents.GAME_FINISHED, () => {
    sounds.play('win', useSettingsStore.getState().soundEnabled);
  });
  socket.on(SocketEvents.GAME_TIMEOUT, () => {
    sounds.play('countdown', useSettingsStore.getState().soundEnabled);
  });
  socket.on(SocketEvents.ROOM_ERROR, (payload: { code: string; message: string }) => {
    console.warn('[socket] room error', payload.code, payload.message);
  });
}

function destroySocket(): void {
  if (!sharedSocket) {
    return;
  }
  sharedSocket.removeAllListeners();
  sharedSocket.disconnect();
  sharedSocket = null;
  sharedToken = null;
  listenersAttached = false;
}

/** Call after login / guest session so realtime uses the new JWT. */
export function ensureGameSocket(): Socket | null {
  const token = api.loadToken();
  if (!token) {
    return null;
  }

  if (sharedSocket && sharedToken !== token) {
    destroySocket();
  }

  if (!sharedSocket) {
    const wsUrl = getWsUrl();
    sharedSocket = io(`${wsUrl}/game`, {
      path: '/socket.io',
      auth: { token },
      // polling first is more reliable through Render / cross-origin proxies
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 20_000,
      forceNew: false,
    });
    sharedToken = token;
    attachSocketListeners(sharedSocket);
  } else {
    sharedSocket.auth = { token };
    if (sharedSocket.connected) {
      identify(sharedSocket, token);
    } else if (!sharedSocket.active) {
      sharedSocket.connect();
    }
  }

  return sharedSocket;
}

function getOrCreateSocket(): Socket | null {
  return ensureGameSocket();
}

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    socketRef.current = getOrCreateSocket();
  }, [userId]);

  const createRoom = useCallback(
    (settings: {
      maxPlayers?: 2 | 3 | 4;
      allowFiveConsecutivePairs?: boolean;
      isPrivate?: boolean;
    }) => {
      const socket = getOrCreateSocket();
      if (!socket) {
        return;
      }
      emitWhenConnected(socket, SocketEvents.ROOM_CREATE, { settings });
    },
    [],
  );

  const joinRoom = useCallback((code: string) => {
    pendingRoomCode = code.toUpperCase();
    const socket = getOrCreateSocket();
    if (!socket) {
      return;
    }
    emitWhenConnected(socket, SocketEvents.ROOM_JOIN, { code: pendingRoomCode });
  }, []);

  const leaveRoom = useCallback(() => {
    pendingRoomCode = null;
    socketRef.current?.emit(SocketEvents.ROOM_LEAVE);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    getOrCreateSocket()?.emit(SocketEvents.ROOM_READY, { ready });
  }, []);

  const startGame = useCallback(() => {
    sounds.play('deal', useSettingsStore.getState().soundEnabled);
    getOrCreateSocket()?.emit(SocketEvents.ROOM_START);
  }, []);

  const kick = useCallback((userId: string) => {
    getOrCreateSocket()?.emit(SocketEvents.ROOM_KICK, { userId });
  }, []);

  const transferHost = useCallback((userId: string) => {
    getOrCreateSocket()?.emit(SocketEvents.ROOM_TRANSFER_HOST, { userId });
  }, []);

  const closeRoom = useCallback(() => {
    pendingRoomCode = null;
    getOrCreateSocket()?.emit(SocketEvents.ROOM_CLOSE);
  }, []);

  const playAgain = useCallback(() => {
    getOrCreateSocket()?.emit(SocketEvents.ROOM_PLAY_AGAIN);
  }, []);

  const playCards = useCallback((cards: Card[]) => {
    sounds.play('play', useSettingsStore.getState().soundEnabled);
    getOrCreateSocket()?.emit(SocketEvents.GAME_PLAY, {
      cards,
      requestId: uuidv4(),
    });
  }, []);

  const pass = useCallback(() => {
    sounds.play('pass', useSettingsStore.getState().soundEnabled);
    getOrCreateSocket()?.emit(SocketEvents.GAME_PASS, { requestId: uuidv4() });
  }, []);

  const sendChat = useCallback((content: string, isEmoji = false) => {
    getOrCreateSocket()?.emit(SocketEvents.CHAT_SEND, { content, isEmoji });
  }, []);

  const reconnect = useCallback((roomCode: string) => {
    pendingRoomCode = roomCode.toUpperCase();
    const socket = getOrCreateSocket();
    if (!socket) {
      return;
    }
    emitWhenConnected(socket, SocketEvents.PLAYER_RECONNECT, { roomCode: pendingRoomCode });
  }, []);

  const requestGameState = useCallback(() => {
    const socket = getOrCreateSocket();
    if (!socket) {
      return;
    }
    emitWhenConnected(socket, SocketEvents.GAME_REQUEST_STATE);
  }, []);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    kick,
    transferHost,
    closeRoom,
    playAgain,
    playCards,
    pass,
    sendChat,
    reconnect,
    requestGameState,
  };
}
