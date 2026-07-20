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

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const setRoom = useGameStore((s) => s.setRoom);
  const setQr = useGameStore((s) => s.setQrDataUrl);
  const setGame = useGameStore((s) => s.setGame);
  const addChat = useGameStore((s) => s.addChat);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const setUser = useAuthStore((s) => s.setUser);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);

  useEffect(() => {
    const token = api.loadToken();
    if (!token) {
      return;
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
    } else {
      sharedSocket.auth = { token };
    }

    const socket = sharedSocket;
    socketRef.current = socket;

    const onAuth = (payload: { user: import('@tien-len/shared').UserProfile }) => {
      setUser(payload.user);
    };
    const onCreated = (payload: {
      room: import('@tien-len/shared').RoomInfo;
      qrDataUrl: string;
    }) => {
      setRoom(payload.room);
      setQr(payload.qrDataUrl);
    };
    const onJoined = (payload: { room: import('@tien-len/shared').RoomInfo }) => {
      setRoom(payload.room);
    };
    const onUpdate = (payload: { room: import('@tien-len/shared').RoomInfo }) => {
      setRoom(payload.room);
    };
    const onPrivate = (payload: {
      state: import('@tien-len/shared').PrivateGameState;
    }) => {
      setGame(payload.state);
      clearSelection();
    };
    const onChat = (payload: { message: import('@tien-len/shared').ChatMessage }) => {
      addChat(payload.message);
    };
    const onFinished = () => {
      sounds.play('win', soundEnabled);
    };
    const onTimeout = () => {
      sounds.play('countdown', soundEnabled);
    };

    socket.on(SocketEvents.AUTH_IDENTIFIED, onAuth);
    socket.on(SocketEvents.ROOM_CREATED, onCreated);
    socket.on(SocketEvents.ROOM_JOINED, onJoined);
    socket.on(SocketEvents.ROOM_UPDATE, onUpdate);
    socket.on(SocketEvents.GAME_PRIVATE_STATE, onPrivate);
    socket.on(SocketEvents.CHAT_MESSAGE, onChat);
    socket.on(SocketEvents.GAME_FINISHED, onFinished);
    socket.on(SocketEvents.GAME_TIMEOUT, onTimeout);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off(SocketEvents.AUTH_IDENTIFIED, onAuth);
      socket.off(SocketEvents.ROOM_CREATED, onCreated);
      socket.off(SocketEvents.ROOM_JOINED, onJoined);
      socket.off(SocketEvents.ROOM_UPDATE, onUpdate);
      socket.off(SocketEvents.GAME_PRIVATE_STATE, onPrivate);
      socket.off(SocketEvents.CHAT_MESSAGE, onChat);
      socket.off(SocketEvents.GAME_FINISHED, onFinished);
      socket.off(SocketEvents.GAME_TIMEOUT, onTimeout);
    };
  }, [addChat, clearSelection, setGame, setQr, setRoom, setUser, soundEnabled]);

  const createRoom = useCallback(
    (settings: {
      maxPlayers?: 2 | 3 | 4;
      allowFiveConsecutivePairs?: boolean;
      isPrivate?: boolean;
    }) => {
      socketRef.current?.emit(SocketEvents.ROOM_CREATE, { settings });
    },
    [],
  );

  const joinRoom = useCallback((code: string) => {
    socketRef.current?.emit(SocketEvents.ROOM_JOIN, { code });
  }, []);

  const leaveRoom = useCallback(() => {
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
    socketRef.current?.emit(SocketEvents.PLAYER_RECONNECT, { roomCode });
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
  };
}
