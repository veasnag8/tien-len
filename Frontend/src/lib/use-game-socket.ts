'use client';

import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@tien-len/socket';
import type { Card } from '@tien-len/shared';
import { v4 as uuidv4 } from 'uuid';
import { WS_URL } from './config';
import { api } from './api';
import { useGameStore } from './game-store';
import { useAuthStore } from './auth-store';
import { sounds } from './sounds';
import { useSettingsStore } from './settings-store';

let sharedSocket: Socket | null = null;
let listenersAttached = false;
let pendingRoomCode: string | null = null;

function emitWhenConnected(socket: Socket, event: string, payload?: unknown): void {
  const emit = () => socket.emit(event, payload);
  if (socket.connected) {
    window.setTimeout(emit, 120);
    return;
  }
  const onConnect = () => {
    socket.off('connect', onConnect);
    window.setTimeout(emit, 120);
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

function attachSocketListeners(socket: Socket): void {
  if (listenersAttached) {
    return;
  }
  listenersAttached = true;

  socket.on('connect', () => {
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

function getOrCreateSocket(): Socket | null {
  const token = api.loadToken();
  if (!token) {
    return null;
  }

  if (!sharedSocket) {
    sharedSocket = io(`${WS_URL}/game`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
    });
    attachSocketListeners(sharedSocket);
  } else {
    sharedSocket.auth = { token };
  }

  if (!sharedSocket.connected && !sharedSocket.active) {
    sharedSocket.connect();
  }

  return sharedSocket;
}

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getOrCreateSocket();
  }, []);

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
    socketRef.current?.emit(SocketEvents.ROOM_READY, { ready });
  }, []);

  const startGame = useCallback(() => {
    sounds.play('deal', useSettingsStore.getState().soundEnabled);
    socketRef.current?.emit(SocketEvents.ROOM_START);
  }, []);

  const kick = useCallback((userId: string) => {
    socketRef.current?.emit(SocketEvents.ROOM_KICK, { userId });
  }, []);

  const transferHost = useCallback((userId: string) => {
    socketRef.current?.emit(SocketEvents.ROOM_TRANSFER_HOST, { userId });
  }, []);

  const closeRoom = useCallback(() => {
    pendingRoomCode = null;
    socketRef.current?.emit(SocketEvents.ROOM_CLOSE);
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit(SocketEvents.ROOM_PLAY_AGAIN);
  }, []);

  const playCards = useCallback((cards: Card[]) => {
    sounds.play('play', useSettingsStore.getState().soundEnabled);
    socketRef.current?.emit(SocketEvents.GAME_PLAY, {
      cards,
      requestId: uuidv4(),
    });
  }, []);

  const pass = useCallback(() => {
    sounds.play('pass', useSettingsStore.getState().soundEnabled);
    socketRef.current?.emit(SocketEvents.GAME_PASS, { requestId: uuidv4() });
  }, []);

  const sendChat = useCallback((content: string, isEmoji = false) => {
    socketRef.current?.emit(SocketEvents.CHAT_SEND, { content, isEmoji });
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
