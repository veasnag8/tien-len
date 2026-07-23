import { Card, Rank, formatCard, sortCards } from '../cards/types';
import { dealCards, findThreeOfSpadesHolder } from '../cards/deck';
import {
  Combination,
  CombinationType,
  canBeat,
  cardsBelongToHand,
  getCarréChopTransfers,
  identifyCombination,
  removeCardsFromHand,
  type ChopTransfer,
} from './combinations';
import { GAME_CONSTANTS } from '../constants';

export type GamePhase = 'dealing' | 'playing' | 'finished';

export interface PlayerGameState {
  userId: string;
  seatIndex: number;
  handCount: number;
  hasFinished: boolean;
  placement: number | null;
  isConnected: boolean;
}

export type WinReason = 'empty_hand' | 'four_twos';

export interface PublicGameState {
  roomId: string;
  phase: GamePhase;
  playerCount: 2 | 3 | 4;
  players: PlayerGameState[];
  currentTurnSeat: number;
  currentCombination: Combination | null;
  lastPlaySeat: number | null;
  passedSeats: number[];
  pile: Card[];
  turnDeadline: number | null;
  rankings: string[];
  allowFiveConsecutivePairs: boolean;
  roundNumber: number;
  /** Why the game ended; set when phase is finished. */
  winReason: WinReason | null;
}

export interface PrivateGameState extends PublicGameState {
  hand: Card[];
}

export interface InternalPlayerState {
  userId: string;
  seatIndex: number;
  hand: Card[];
  hasFinished: boolean;
  placement: number | null;
  isConnected: boolean;
}

export interface InternalGameState {
  roomId: string;
  phase: GamePhase;
  playerCount: 2 | 3 | 4;
  players: InternalPlayerState[];
  currentTurnSeat: number;
  currentCombination: Combination | null;
  lastPlaySeat: number | null;
  passedSeats: Set<number>;
  pile: Card[];
  turnDeadline: number | null;
  turnTimeoutMs: number;
  rankings: string[];
  allowFiveConsecutivePairs: boolean;
  roundNumber: number;
  finishedCount: number;
  winReason: WinReason | null;
}

/** ផ្ទុះ — all four rank-2 cards in one hand → instant win. */
export function hasFourTwos(hand: Card[]): boolean {
  return hand.filter((c) => c.rank === Rank.Two).length === 4;
}

export type MoveResult =
  | { ok: true; state: InternalGameState; chopTransfers?: ChopTransfer[]; autoPassed?: boolean }
  | { ok: false; error: string; autoPassed?: boolean };

export function createGame(
  roomId: string,
  userIds: string[],
  allowFiveConsecutivePairs: boolean = true,
  random: () => number = Math.random,
  turnTimeoutMs: number = GAME_CONSTANTS.TURN_TIMEOUT_MS,
  /** Previous winner leads next game; omit on first game so 3♠ opens. */
  leadUserId?: string | null,
  roundNumber: number = 1,
): InternalGameState {
  const playerCount = userIds.length as 2 | 3 | 4;
  if (playerCount < GAME_CONSTANTS.MIN_PLAYERS || playerCount > GAME_CONSTANTS.MAX_PLAYERS) {
    throw new Error('Invalid player count');
  }

  const timeoutMs = turnTimeoutMs > 0 ? turnTimeoutMs : GAME_CONSTANTS.TURN_TIMEOUT_MS;
  const hands = dealCards(playerCount, random);

  const leadFromPrevious =
    leadUserId != null ? userIds.findIndex((id) => id === leadUserId) : -1;
  const firstSeat =
    leadFromPrevious >= 0 ? leadFromPrevious : findThreeOfSpadesHolder(hands);

  const players: InternalPlayerState[] = userIds.map((userId, seatIndex) => ({
    userId,
    seatIndex,
    hand: sortCards(hands[seatIndex]!),
    hasFinished: false,
    placement: null,
    isConnected: true,
  }));

  const state: InternalGameState = {
    roomId,
    phase: 'playing',
    playerCount,
    players,
    currentTurnSeat: firstSeat,
    currentCombination: null,
    lastPlaySeat: null,
    passedSeats: new Set(),
    pile: [],
    turnDeadline: Date.now() + timeoutMs + GAME_CONSTANTS.START_COUNTDOWN_MS,
    turnTimeoutMs: timeoutMs,
    rankings: [],
    allowFiveConsecutivePairs,
    roundNumber: Math.max(1, Math.floor(roundNumber)),
    finishedCount: 0,
    winReason: null,
  };

  applyFourTwosInstantWin(state);
  return state;
}

function applyFourTwosInstantWin(state: InternalGameState): void {
  const winnerSeat = state.players.findIndex((p) => hasFourTwos(p.hand));
  if (winnerSeat < 0) {
    return;
  }

  const winner = state.players[winnerSeat]!;
  winner.hasFinished = true;
  winner.placement = 1;
  state.rankings = [winner.userId];
  state.finishedCount = 1;
  state.winReason = 'four_twos';
  state.phase = 'finished';
  state.turnDeadline = null;

  for (const player of state.players) {
    if (player.seatIndex === winnerSeat) {
      continue;
    }
    player.hasFinished = true;
    state.finishedCount += 1;
    player.placement = state.finishedCount;
    state.rankings.push(player.userId);
  }
}

function activeSeats(state: InternalGameState): number[] {
  return state.players
    .filter((p) => !p.hasFinished)
    .map((p) => p.seatIndex)
    .sort((a, b) => a - b);
}

function nextActiveSeat(state: InternalGameState, fromSeat: number): number {
  const seats = activeSeats(state);
  if (seats.length === 0) {
    return fromSeat;
  }
  const idx = seats.findIndex((s) => s > fromSeat);
  if (idx >= 0) {
    return seats[idx]!;
  }
  return seats[0]!;
}

function turnMs(state: InternalGameState): number {
  return state.turnTimeoutMs > 0 ? state.turnTimeoutMs : GAME_CONSTANTS.TURN_TIMEOUT_MS;
}

function resetTrick(state: InternalGameState, starterSeat: number): void {
  state.currentCombination = null;
  state.passedSeats = new Set();
  state.pile = [];
  state.currentTurnSeat = starterSeat;
  state.lastPlaySeat = null;
  state.turnDeadline = Date.now() + turnMs(state);
}

function markFinished(state: InternalGameState, seat: number): void {
  const player = state.players[seat]!;
  if (player.hasFinished) {
    return;
  }
  player.hasFinished = true;
  state.finishedCount += 1;
  player.placement = state.finishedCount;
  state.rankings.push(player.userId);

  const remaining = activeSeats(state);
  if (remaining.length === 1) {
    const lastSeat = remaining[0]!;
    const lastPlayer = state.players[lastSeat]!;
    lastPlayer.hasFinished = true;
    lastPlayer.placement = state.finishedCount + 1;
    state.rankings.push(lastPlayer.userId);
    state.finishedCount += 1;
    state.phase = 'finished';
    state.turnDeadline = null;
    state.winReason = state.winReason ?? 'empty_hand';
  } else if (remaining.length === 0) {
    state.phase = 'finished';
    state.turnDeadline = null;
    state.winReason = state.winReason ?? 'empty_hand';
  }
}

/** Player left mid-game — last place among those still in; continue if ≥2 remain. */
export function forfeitPlayer(state: InternalGameState, userId: string): boolean {
  if (state.phase !== 'playing') {
    return false;
  }
  const player = state.players.find((p) => p.userId === userId);
  if (!player || player.hasFinished) {
    return false;
  }

  const seat = player.seatIndex;
  const othersStillIn = state.players.filter((p) => !p.hasFinished && p.userId !== userId).length;

  player.hand = [];
  player.hasFinished = true;
  player.isConnected = false;
  player.placement = othersStillIn + 1;
  state.finishedCount += 1;
  state.passedSeats.delete(seat);

  const remaining = activeSeats(state);

  if (remaining.length <= 1) {
    if (remaining.length === 1) {
      const winner = state.players[remaining[0]!]!;
      winner.hasFinished = true;
      winner.placement = 1;
    }
    // Winner first, then others by placement (2, 3, …)
    const ordered = [...state.players].sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99));
    state.rankings = ordered.map((p) => p.userId);
    state.finishedCount = state.players.length;
    state.phase = 'finished';
    state.turnDeadline = null;
    state.winReason = state.winReason ?? 'empty_hand';
    return true;
  }

  if (state.currentTurnSeat === seat) {
    if (state.currentCombination && state.lastPlaySeat === seat) {
      resetTrick(state, nextActiveSeat(state, seat));
    } else {
      state.currentTurnSeat = nextActiveSeat(state, seat);
      state.turnDeadline = Date.now() + turnMs(state);
    }
  }

  return true;
}

export function playCards(
  state: InternalGameState,
  userId: string,
  cards: Card[],
): MoveResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'Game is not in progress' };
  }

  const player = state.players.find((p) => p.userId === userId);
  if (!player) {
    return { ok: false, error: 'Player not found' };
  }
  if (player.hasFinished) {
    return { ok: false, error: 'Player already finished' };
  }
  if (player.seatIndex !== state.currentTurnSeat) {
    return { ok: false, error: 'Not your turn' };
  }
  if (!cardsBelongToHand(cards, player.hand)) {
    return { ok: false, error: 'Cards not in hand' };
  }

  const combination = identifyCombination(cards);
  if (!combination) {
    return {
      ok: false,
      error:
        'Invalid combination. Straight (រាង) needs 3+ consecutive ranks (e.g. 3-4-5 … A), no 2s, no duplicate ranks.',
    };
  }

  if (
    !state.allowFiveConsecutivePairs &&
    combination.type === CombinationType.FiveConsecutivePairs
  ) {
    return { ok: false, error: 'Five consecutive pairs are disabled' };
  }

  if (state.currentCombination) {
    if (!canBeat(combination, state.currentCombination, state.allowFiveConsecutivePairs)) {
      if (
        combination.type === CombinationType.Straight &&
        state.currentCombination.type === CombinationType.Straight &&
        combination.length !== state.currentCombination.length
      ) {
        return {
          ok: false,
          error: `Straight must match length (${state.currentCombination.length} cards on table).`,
        };
      }
      if (combination.type !== state.currentCombination.type) {
        return {
          ok: false,
          error: 'Must play the same combination type as the cards on the table (or a valid chop).',
        };
      }
      return {
        ok: false,
        error: `Too small — yours ${formatCard(combination.highestCard)}, table has ${formatCard(state.currentCombination.highestCard)}.`,
      };
    }
  }

  const victimId =
    state.lastPlaySeat != null ? (state.players[state.lastPlaySeat]?.userId ?? null) : null;
  const chopTransfers = getCarréChopTransfers(
    combination,
    state.currentCombination,
    userId,
    victimId,
  );

  player.hand = removeCardsFromHand(player.hand, cards);
  state.pile = [...state.pile, ...cards];
  state.currentCombination = combination;
  state.lastPlaySeat = player.seatIndex;
  state.passedSeats = new Set();

  if (player.hand.length === 0) {
    markFinished(state, player.seatIndex);
    if (state.rankings.length >= state.playerCount) {
      return { ok: true, state, chopTransfers };
    }
  }

  state.currentTurnSeat = nextActiveSeat(state, player.seatIndex);
  state.turnDeadline = Date.now() + turnMs(state);
  return { ok: true, state, chopTransfers };
}

export function passTurn(state: InternalGameState, userId: string): MoveResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'Game is not in progress' };
  }

  const player = state.players.find((p) => p.userId === userId);
  if (!player) {
    return { ok: false, error: 'Player not found' };
  }
  if (player.seatIndex !== state.currentTurnSeat) {
    return { ok: false, error: 'Not your turn' };
  }
  if (!state.currentCombination) {
    return { ok: false, error: 'Cannot pass on a free turn' };
  }

  state.passedSeats.add(player.seatIndex);

  const remaining = activeSeats(state).filter((seat) => !state.passedSeats.has(seat));
  if (remaining.length <= 1) {
    const winnerSeat = state.lastPlaySeat ?? player.seatIndex;
    resetTrick(state, winnerSeat);
    return { ok: true, state };
  }

  state.currentTurnSeat = nextActiveSeat(state, player.seatIndex);
  state.turnDeadline = Date.now() + turnMs(state);
  return { ok: true, state };
}

export function autoPassOnTimeout(state: InternalGameState): MoveResult {
  if (state.phase !== 'playing' || !state.turnDeadline) {
    return { ok: false, error: 'No active turn' };
  }
  // Small clock skew tolerance between client countdown and server
  if (Date.now() + 400 < state.turnDeadline) {
    return { ok: false, error: 'Turn not expired' };
  }

  const player = state.players[state.currentTurnSeat];
  if (!player || player.hasFinished) {
    return { ok: false, error: 'Invalid turn player' };
  }

  // Free lead: must play something → auto-play lowest, then turn goes to next
  if (!state.currentCombination) {
    const hand = player.hand;
    if (hand.length === 0) {
      return { ok: false, error: 'Empty hand' };
    }
    const lowest = sortCards(hand)[0]!;
    return { ...playCards(state, player.userId, [lowest]), autoPassed: true };
  }

  // Following a play: auto-pass → next player
  return { ...passTurn(state, player.userId), autoPassed: true };
}

export function toPublicState(state: InternalGameState): PublicGameState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    playerCount: state.playerCount,
    players: state.players.map((p) => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      handCount: p.hand.length,
      hasFinished: p.hasFinished,
      placement: p.placement,
      isConnected: p.isConnected,
    })),
    currentTurnSeat: state.currentTurnSeat,
    currentCombination: state.currentCombination,
    lastPlaySeat: state.lastPlaySeat,
    passedSeats: [...state.passedSeats],
    pile: state.pile,
    turnDeadline: state.turnDeadline,
    rankings: [...state.rankings],
    allowFiveConsecutivePairs: state.allowFiveConsecutivePairs,
    roundNumber: state.roundNumber,
    winReason: state.winReason,
  };
}

export function toPrivateState(
  state: InternalGameState,
  userId: string,
): PrivateGameState {
  const player = state.players.find((p) => p.userId === userId);
  return {
    ...toPublicState(state),
    hand: player ? [...player.hand] : [],
  };
}
