import { Card, Rank, compareCards, sortCards } from '../cards/types';

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
