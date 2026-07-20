import { Card, sortCards } from '../cards/types';
import { dealCards, findThreeOfSpadesHolder } from '../cards/deck';
import {
  Combination,
  CombinationType,
  canBeat,
  cardsBelongToHand,
  identifyCombination,
  removeCardsFromHand,
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
  rankings: string[];
  allowFiveConsecutivePairs: boolean;
  roundNumber: number;
  finishedCount: number;
}

export type MoveResult =
  | { ok: true; state: InternalGameState; autoPassed?: boolean }
  | { ok: false; error: string; autoPassed?: boolean };

export function createGame(
  roomId: string,
  userIds: string[],
  allowFiveConsecutivePairs: boolean = true,
  random: () => number = Math.random,
): InternalGameState {
  const playerCount = userIds.length as 2 | 3 | 4;
  if (playerCount < GAME_CONSTANTS.MIN_PLAYERS || playerCount > GAME_CONSTANTS.MAX_PLAYERS) {
    throw new Error('Invalid player count');
  }

  const hands = dealCards(playerCount, random);
  const firstSeat = findThreeOfSpadesHolder(hands);

  const players: InternalPlayerState[] = userIds.map((userId, seatIndex) => ({
    userId,
    seatIndex,
    hand: sortCards(hands[seatIndex]!),
    hasFinished: false,
    placement: null,
    isConnected: true,
  }));

  return {
    roomId,
    phase: 'playing',
    playerCount,
    players,
    currentTurnSeat: firstSeat,
    currentCombination: null,
    lastPlaySeat: null,
    passedSeats: new Set(),
    pile: [],
    turnDeadline: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
    rankings: [],
    allowFiveConsecutivePairs,
    roundNumber: 1,
    finishedCount: 0,
  };
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

function resetTrick(state: InternalGameState, starterSeat: number): void {
  state.currentCombination = null;
  state.passedSeats = new Set();
  state.pile = [];
  state.currentTurnSeat = starterSeat;
  state.lastPlaySeat = null;
  state.turnDeadline = Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS;
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
  } else if (remaining.length === 0) {
    state.phase = 'finished';
    state.turnDeadline = null;
  }
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
    return { ok: false, error: 'Invalid combination' };
  }

  if (
    !state.allowFiveConsecutivePairs &&
    combination.type === CombinationType.FiveConsecutivePairs
  ) {
    return { ok: false, error: 'Five consecutive pairs are disabled' };
  }

  if (state.currentCombination) {
    if (!canBeat(combination, state.currentCombination, state.allowFiveConsecutivePairs)) {
      return { ok: false, error: 'Combination cannot beat current play' };
    }
  }

  player.hand = removeCardsFromHand(player.hand, cards);
  state.pile = [...state.pile, ...cards];
  state.currentCombination = combination;
  state.lastPlaySeat = player.seatIndex;
  state.passedSeats = new Set();

  if (player.hand.length === 0) {
    markFinished(state, player.seatIndex);
    if (state.rankings.length >= state.playerCount) {
      return { ok: true, state };
    }
  }

  state.currentTurnSeat = nextActiveSeat(state, player.seatIndex);
  state.turnDeadline = Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS;
  return { ok: true, state };
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
  state.turnDeadline = Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS;
  return { ok: true, state };
}

export function autoPassOnTimeout(state: InternalGameState): MoveResult {
  if (state.phase !== 'playing' || !state.turnDeadline) {
    return { ok: false, error: 'No active turn' };
  }
  if (Date.now() < state.turnDeadline) {
    return { ok: false, error: 'Turn not expired' };
  }

  const player = state.players[state.currentTurnSeat];
  if (!player || player.hasFinished) {
    return { ok: false, error: 'Invalid turn player' };
  }

  if (!state.currentCombination) {
    const hand = player.hand;
    if (hand.length === 0) {
      return { ok: false, error: 'Empty hand' };
    }
    const lowest = sortCards(hand)[0]!;
    return { ...playCards(state, player.userId, [lowest]), autoPassed: true };
  }

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
