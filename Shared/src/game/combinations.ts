import { Card, Rank, compareCards, isRedSuit, sortCards } from '../cards/types';
import { GAME_CONSTANTS } from '../constants';

export enum CombinationType {
  Single = 'SINGLE',
  Pair = 'PAIR',
  Triple = 'TRIPLE',
  FourOfAKind = 'FOUR_OF_A_KIND',
  Straight = 'STRAIGHT',
  ThreeConsecutivePairs = 'THREE_CONSECUTIVE_PAIRS',
  FourConsecutivePairs = 'FOUR_CONSECUTIVE_PAIRS',
  FiveConsecutivePairs = 'FIVE_CONSECUTIVE_PAIRS',
}

export interface Combination {
  type: CombinationType;
  cards: Card[];
  highestCard: Card;
  length: number;
}

/** Instant points when ការ៉េ (four of a kind) chops a 2 / overchops another ការ៉េ. */
export interface ChopTransfer {
  attackerId: string;
  victimId: string;
  /** Positive amount: attacker gains, victim loses. */
  points: number;
  choppedCard: Card;
  kind?: 'chop' | 'refund' | 'overchop';
}

/**
 * Active ការ៉េ-on-2 chain for the current trick.
 * Overchop refunds the previous victim and doubles the stake onto the last ការ៉េ player.
 */
export interface CarréChopChain {
  basePoints: number;
  currentPoints: number;
  holderId: string;
  lastVictimId: string;
  sourceCard: Card;
}

/** Points for chopping one 2 with ការ៉េ (red +3, black +2). */
export function carréChopPointsForCard(card: Card): number {
  return isRedSuit(card.suit)
    ? GAME_CONSTANTS.CHOP_RED_TWO_POINTS
    : GAME_CONSTANTS.CHOP_BLACK_TWO_POINTS;
}

/**
 * Resolve ការ៉េ chop / overchop transfers for this play.
 * - First chop on 2: attacker +base, 2-player −base (red 3 / black 2, summed for pair).
 * - Higher ការ៉េ overchops: refund last victim, then ×2 onto previous ការ៉េ holder.
 */
export function resolveCarréChop(
  incoming: Combination,
  current: Combination | null,
  attackerId: string,
  victimId: string | null,
  chain: CarréChopChain | null,
): { transfers: ChopTransfer[]; chain: CarréChopChain | null } {
  if (!current || !victimId || victimId === attackerId) {
    return { transfers: [], chain };
  }
  if (incoming.type !== CombinationType.FourOfAKind) {
    // Another combo ended the ការ៉េ chain — prior chop points stay as settled
    return { transfers: [], chain: null };
  }

  // Overchop: bigger ការ៉េ (e.g. 6666) beats previous ការ៉េ (5555) in an active chain
  if (chain && current.type === CombinationType.FourOfAKind) {
    const doubled = chain.currentPoints * 2;
    const transfers: ChopTransfer[] = [
      {
        // Undo previous transfer so the original 2-player (or prior victim) is cleared
        attackerId: chain.lastVictimId,
        victimId: chain.holderId,
        points: chain.currentPoints,
        choppedCard: chain.sourceCard,
        kind: 'refund',
      },
      {
        attackerId,
        victimId: chain.holderId,
        points: doubled,
        choppedCard: chain.sourceCard,
        kind: 'overchop',
      },
    ];
    return {
      transfers,
      chain: {
        basePoints: chain.basePoints,
        currentPoints: doubled,
        holderId: attackerId,
        lastVictimId: chain.holderId,
        sourceCard: chain.sourceCard,
      },
    };
  }

  // First chop: ការ៉េ beats single/pair of 2s
  const isSingleTwo =
    current.type === CombinationType.Single && toRank(current.highestCard.rank) === Rank.Two;
  const isPairTwos =
    current.type === CombinationType.Pair && toRank(current.highestCard.rank) === Rank.Two;
  if (!isSingleTwo && !isPairTwos) {
    return { transfers: [], chain: null };
  }

  const basePoints = current.cards.reduce((sum, card) => sum + carréChopPointsForCard(card), 0);
  const sourceCard = current.cards[0]!;
  return {
    transfers: [
      {
        attackerId,
        victimId,
        points: basePoints,
        choppedCard: sourceCard,
        kind: 'chop',
      },
    ],
    chain: {
      basePoints,
      currentPoints: basePoints,
      holderId: attackerId,
      lastVictimId: victimId,
      sourceCard,
    },
  };
}

/** @deprecated use resolveCarréChop */
export function getCarréChopTransfers(
  incoming: Combination,
  current: Combination | null,
  attackerId: string,
  victimId: string | null,
): ChopTransfer[] {
  return resolveCarréChop(incoming, current, attackerId, victimId, null).transfers;
}

/** Coerce rank in case JSON/socket sent strings ("10") instead of numbers. */
function toRank(rank: Rank | string | number): Rank {
  return Number(rank) as Rank;
}

function sameRank(cards: Card[]): boolean {
  const first = toRank(cards[0]!.rank);
  return cards.every((c) => toRank(c.rank) === first);
}

function isConsecutiveRanks(ranks: Rank[]): boolean {
  const nums = ranks.map(toRank);
  if (nums.some((r) => r === Rank.Two)) {
    return false;
  }
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i]! !== nums[i - 1]! + 1) {
      return false;
    }
  }
  return true;
}

function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const card of cards) {
    const rank = toRank(card.rank);
    const group = map.get(rank) ?? [];
    group.push({ ...card, rank });
    map.set(rank, group);
  }
  return map;
}

export function identifyCombination(cards: Card[]): Combination | null {
  if (cards.length === 0) {
    return null;
  }

  // Normalize ranks so "10" + 1 never becomes "101"
  const normalized = cards.map((c) => ({ ...c, rank: toRank(c.rank) }));
  const sorted = sortCards(normalized);
  const highestCard = sorted[sorted.length - 1]!;

  if (sorted.length === 1) {
    return {
      type: CombinationType.Single,
      cards: sorted,
      highestCard,
      length: 1,
    };
  }

  if (sorted.length === 2 && sameRank(sorted)) {
    return {
      type: CombinationType.Pair,
      cards: sorted,
      highestCard,
      length: 2,
    };
  }

  if (sorted.length === 3 && sameRank(sorted)) {
    return {
      type: CombinationType.Triple,
      cards: sorted,
      highestCard,
      length: 3,
    };
  }

  if (sorted.length === 4 && sameRank(sorted)) {
    return {
      type: CombinationType.FourOfAKind,
      cards: sorted,
      highestCard,
      length: 4,
    };
  }

  const byRank = groupByRank(sorted);
  const ranks = [...byRank.keys()].sort((a, b) => a - b);
  const allPairs = ranks.every((r) => byRank.get(r)!.length === 2);

  if (allPairs && isConsecutiveRanks(ranks)) {
    if (ranks.length === 3) {
      return {
        type: CombinationType.ThreeConsecutivePairs,
        cards: sorted,
        highestCard,
        length: 6,
      };
    }
    if (ranks.length === 4) {
      return {
        type: CombinationType.FourConsecutivePairs,
        cards: sorted,
        highestCard,
        length: 8,
      };
    }
    if (ranks.length === 5) {
      return {
        type: CombinationType.FiveConsecutivePairs,
        cards: sorted,
        highestCard,
        length: 10,
      };
    }
  }

  // Straight (រាង): 3+ consecutive ranks, no 2s, one card per rank (3-4-5 … up to A)
  if (
    sorted.length >= 3 &&
    byRank.size === sorted.length &&
    isConsecutiveRanks(ranks)
  ) {
    return {
      type: CombinationType.Straight,
      cards: sorted,
      highestCard,
      length: sorted.length,
    };
  }

  return null;
}

export function canBeat(
  incoming: Combination,
  current: Combination,
  allowFivePairs: boolean = true,
): boolean {
  if (canChop(incoming, current, allowFivePairs)) {
    return true;
  }

  if (incoming.type !== current.type) {
    return false;
  }

  if (
    incoming.type === CombinationType.Straight &&
    incoming.length !== current.length
  ) {
    return false;
  }

  return compareCards(incoming.highestCard, current.highestCard) > 0;
}

export function canChop(
  incoming: Combination,
  current: Combination,
  allowFivePairs: boolean = true,
): boolean {
  const isSingleTwo =
    current.type === CombinationType.Single && current.highestCard.rank === Rank.Two;
  const isPairTwos =
    current.type === CombinationType.Pair && current.highestCard.rank === Rank.Two;

  if (incoming.type === CombinationType.FourOfAKind) {
    if (isSingleTwo || isPairTwos) {
      return true;
    }
    if (current.type === CombinationType.ThreeConsecutivePairs) {
      return true;
    }
    if (
      current.type === CombinationType.FourOfAKind &&
      compareCards(incoming.highestCard, current.highestCard) > 0
    ) {
      return true;
    }
  }

  if (incoming.type === CombinationType.ThreeConsecutivePairs) {
    if (isSingleTwo) {
      return true;
    }
    if (
      current.type === CombinationType.ThreeConsecutivePairs &&
      compareCards(incoming.highestCard, current.highestCard) > 0
    ) {
      return true;
    }
  }

  if (incoming.type === CombinationType.FourConsecutivePairs) {
    if (isSingleTwo || isPairTwos) {
      return true;
    }
    if (current.type === CombinationType.ThreeConsecutivePairs) {
      return true;
    }
    if (current.type === CombinationType.FourOfAKind) {
      return true;
    }
    if (
      current.type === CombinationType.FourConsecutivePairs &&
      compareCards(incoming.highestCard, current.highestCard) > 0
    ) {
      return true;
    }
  }

  if (allowFivePairs && incoming.type === CombinationType.FiveConsecutivePairs) {
    if (
      isSingleTwo ||
      isPairTwos ||
      current.type === CombinationType.ThreeConsecutivePairs ||
      current.type === CombinationType.FourOfAKind ||
      current.type === CombinationType.FourConsecutivePairs
    ) {
      return true;
    }
    if (
      current.type === CombinationType.FiveConsecutivePairs &&
      compareCards(incoming.highestCard, current.highestCard) > 0
    ) {
      return true;
    }
  }

  return false;
}

export function cardsBelongToHand(selected: Card[], hand: Card[]): boolean {
  const handIds = new Map<string, number>();
  for (const card of hand) {
    handIds.set(card.id, (handIds.get(card.id) ?? 0) + 1);
  }
  for (const card of selected) {
    const count = handIds.get(card.id) ?? 0;
    if (count <= 0) {
      return false;
    }
    handIds.set(card.id, count - 1);
  }
  return true;
}

export function removeCardsFromHand(hand: Card[], played: Card[]): Card[] {
  const remaining = [...hand];
  for (const card of played) {
    const index = remaining.findIndex((c) => c.id === card.id);
    if (index >= 0) {
      remaining.splice(index, 1);
    }
  }
  return remaining;
}
