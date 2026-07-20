export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';

export interface RoomPlayer {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  country: string;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  seatIndex: number;
}

export interface RoomSettings {
  maxPlayers: 2 | 3 | 4;
  allowFiveConsecutivePairs: boolean;
  turnTimeoutMs: number;
  isPrivate: boolean;
}

export interface RoomInfo {
  id: string;
  code: string;
  inviteUrl: string;
  status: RoomStatus;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  content: string;
  isEmoji: boolean;
  createdAt: string;
}

export function generateRoomCode(length: number = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
