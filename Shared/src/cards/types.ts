export enum Suit {
  Spades = 'S',
  Clubs = 'C',
  Diamonds = 'D',
  Hearts = 'H',
}

export enum Rank {
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
  Two = 15,
}

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export const SUIT_ORDER: Record<Suit, number> = {
  [Suit.Spades]: 0,
  [Suit.Clubs]: 1,
  [Suit.Diamonds]: 2,
  [Suit.Hearts]: 3,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.Spades]: '♠',
  [Suit.Clubs]: '♣',
  [Suit.Diamonds]: '♦',
  [Suit.Hearts]: '♥',
};

export const RANK_LABELS: Record<Rank, string> = {
  [Rank.Three]: '3',
  [Rank.Four]: '4',
  [Rank.Five]: '5',
  [Rank.Six]: '6',
  [Rank.Seven]: '7',
  [Rank.Eight]: '8',
  [Rank.Nine]: '9',
  [Rank.Ten]: '10',
  [Rank.Jack]: 'J',
  [Rank.Queen]: 'Q',
  [Rank.King]: 'K',
  [Rank.Ace]: 'A',
  [Rank.Two]: '2',
};

export function cardId(rank: Rank, suit: Suit): string {
  return `${RANK_LABELS[rank]}${suit}`;
}

export function createCard(rank: Rank, suit: Suit): Card {
  return { id: cardId(rank, suit), rank, suit };
}

export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.Hearts || suit === Suit.Diamonds;
}

export function formatCard(card: Card): string {
  return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}
