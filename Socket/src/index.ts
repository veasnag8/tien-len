import type {
  Card,
  ChatMessage,
  ChopTransfer,
  PrivateGameState,
  PublicGameState,
  RoomInfo,
  RoomSettings,
  UserProfile,
} from '@tien-len/shared';

export const SocketEvents = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  AUTH_IDENTIFY: 'auth:identify',
  AUTH_IDENTIFIED: 'auth:identified',

  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_LEAVE: 'room:leave',
  ROOM_LEFT: 'room:left',
  ROOM_UPDATE: 'room:update',
  ROOM_READY: 'room:ready',
  ROOM_START: 'room:start',
  ROOM_KICK: 'room:kick',
  ROOM_TRANSFER_HOST: 'room:transfer_host',
  ROOM_CLOSE: 'room:close',
  ROOM_RESTART: 'room:restart',
  ROOM_PLAY_AGAIN: 'room:play_again',
  ROOM_ERROR: 'room:error',

  GAME_STATE: 'game:state',
  GAME_PRIVATE_STATE: 'game:private_state',
  GAME_REQUEST_STATE: 'game:request_state',
  GAME_PLAY: 'game:play',
  GAME_PASS: 'game:pass',
  GAME_TIMEOUT: 'game:timeout',
  GAME_CHECK_TIMEOUT: 'game:check_timeout',
  GAME_FINISHED: 'game:finished',
  GAME_ERROR: 'game:error',
  /** ការ៉េ chopped a 2 — instant point transfer. */
  GAME_CHOP: 'game:chop',

  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',

  PLAYER_RECONNECT: 'player:reconnect',
  PLAYER_RECONNECTED: 'player:reconnected',
  PLAYER_DISCONNECTED: 'player:disconnected',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

export interface RoomCreatePayload {
  settings: Partial<RoomSettings>;
}

export interface RoomJoinPayload {
  code: string;
}

export interface RoomReadyPayload {
  ready: boolean;
}

export interface RoomKickPayload {
  userId: string;
}

export interface RoomTransferHostPayload {
  userId: string;
}

export interface GamePlayPayload {
  cards: Card[];
  requestId: string;
}

export interface GamePassPayload {
  requestId: string;
}

export interface ChatSendPayload {
  content: string;
  isEmoji?: boolean;
}

export interface AuthIdentifyPayload {
  token: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
}

export interface ClientToServerEvents {
  [SocketEvents.AUTH_IDENTIFY]: (payload: AuthIdentifyPayload) => void;
  [SocketEvents.ROOM_CREATE]: (payload: RoomCreatePayload) => void;
  [SocketEvents.ROOM_JOIN]: (payload: RoomJoinPayload) => void;
  [SocketEvents.ROOM_LEAVE]: () => void;
  [SocketEvents.ROOM_READY]: (payload: RoomReadyPayload) => void;
  [SocketEvents.ROOM_START]: () => void;
  [SocketEvents.ROOM_KICK]: (payload: RoomKickPayload) => void;
  [SocketEvents.ROOM_TRANSFER_HOST]: (payload: RoomTransferHostPayload) => void;
  [SocketEvents.ROOM_CLOSE]: () => void;
  [SocketEvents.ROOM_RESTART]: () => void;
  [SocketEvents.ROOM_PLAY_AGAIN]: () => void;
  [SocketEvents.GAME_REQUEST_STATE]: () => void;
  [SocketEvents.GAME_PLAY]: (payload: GamePlayPayload) => void;
  [SocketEvents.GAME_PASS]: (payload: GamePassPayload) => void;
  [SocketEvents.CHAT_SEND]: (payload: ChatSendPayload) => void;
  [SocketEvents.PLAYER_RECONNECT]: (payload: { roomCode: string }) => void;
}

export interface ServerToClientEvents {
  [SocketEvents.AUTH_IDENTIFIED]: (payload: { user: UserProfile }) => void;
  [SocketEvents.ROOM_CREATED]: (payload: { room: RoomInfo; qrDataUrl: string }) => void;
  [SocketEvents.ROOM_JOINED]: (payload: { room: RoomInfo }) => void;
  [SocketEvents.ROOM_LEFT]: (payload: {
    roomId: string;
    reason?: 'left' | 'kicked' | 'closed' | 'disconnect';
  }) => void;
  [SocketEvents.ROOM_UPDATE]: (payload: { room: RoomInfo }) => void;
  [SocketEvents.ROOM_ERROR]: (payload: SocketErrorPayload) => void;
  [SocketEvents.GAME_STATE]: (payload: { state: PublicGameState }) => void;
  [SocketEvents.GAME_PRIVATE_STATE]: (payload: { state: PrivateGameState }) => void;
  [SocketEvents.GAME_FINISHED]: (payload: {
    rankings: string[];
    state: PublicGameState;
    /** Epoch ms when the next round auto-starts (server). */
    nextGameAt?: number;
  }) => void;
  [SocketEvents.GAME_TIMEOUT]: (payload: { userId: string }) => void;
  [SocketEvents.GAME_ERROR]: (payload: SocketErrorPayload) => void;
  [SocketEvents.GAME_CHOP]: (payload: { transfers: ChopTransfer[] }) => void;
  [SocketEvents.CHAT_MESSAGE]: (payload: { message: ChatMessage }) => void;
  [SocketEvents.PLAYER_RECONNECTED]: (payload: { userId: string }) => void;
  [SocketEvents.PLAYER_DISCONNECTED]: (payload: { userId: string }) => void;
}
