export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  /** Always deal this many cards per player (2–4 players); leftover deck unused. */
  HAND_SIZE: 13,
  TURN_TIMEOUT_MS: 30_000,
  /** Client 3-2-1 overlay before play; added to first turn deadline. */
  START_COUNTDOWN_MS: 3_000,
  /** After a round ends, wait this long then deal the next game automatically. */
  AUTO_NEXT_GAME_MS: 4_500,
  /** Show last winning play briefly before rankings overlay. */
  WIN_REVEAL_MS: 1_500,
  /** ការ៉េ chops a red 2 (♥♦): attacker +N, victim −N. */
  CHOP_RED_TWO_POINTS: 3,
  /** ការ៉េ chops a black 2 (♣♠): attacker +N, victim −N. */
  CHOP_BLACK_TWO_POINTS: 2,
  ROOM_CODE_LENGTH: 6,
  MAX_NICKNAME_LENGTH: 24,
  MAX_CHAT_LENGTH: 200,
  DEAL_ANIMATION_MS: 800,
  RECONNECT_GRACE_MS: 120_000,
  RATE_LIMIT_WINDOW_MS: 1_000,
  RATE_LIMIT_MAX_REQUESTS: 20,
} as const;

/**
 * Round points by finish place (index 0 = 1st). Totals may go below 0.
 * 2p: +3 / -3 · 3p: +3 / -1 / -2 · 4p: +3 / +2 / -2 / -3
 */
export const POINTS_BY_PLACEMENT: Record<2 | 3 | 4, readonly number[]> = {
  2: [3, -3],
  3: [3, -1, -2],
  4: [3, 2, -2, -3],
};

export function pointsForPlacement(playerCount: number, placeIndex: number): number {
  const table = POINTS_BY_PLACEMENT[playerCount as 2 | 3 | 4];
  return table?.[placeIndex] ?? 0;
}

export const SUPPORTED_LOCALES = ['km', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'km';
