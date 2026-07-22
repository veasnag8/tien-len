export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  /** Always deal this many cards per player (2–4 players); leftover deck unused. */
  HAND_SIZE: 13,
  TURN_TIMEOUT_MS: 30_000,
  ROOM_CODE_LENGTH: 6,
  MAX_NICKNAME_LENGTH: 24,
  MAX_CHAT_LENGTH: 200,
  DEAL_ANIMATION_MS: 800,
  RECONNECT_GRACE_MS: 120_000,
  RATE_LIMIT_WINDOW_MS: 1_000,
  RATE_LIMIT_MAX_REQUESTS: 20,
} as const;

export const SUPPORTED_LOCALES = ['km', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'km';
