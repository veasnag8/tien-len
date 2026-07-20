import { Card, Rank, Suit, createCard } from './types';

const ALL_RANKS: Rank[] = [
  Rank.Three,
  Rank.Four,
  Rank.Five,
  Rank.Six,
  Rank.Seven,
  Rank.Eight,
  Rank.Nine,
  Rank.Ten,
  Rank.Jack,
  Rank.Queen,
  Rank.King,
  Rank.Ace,
  Rank.Two,
];

const ALL_SUITS: Suit[] = [Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Hearts];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of ALL_SUITS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], random: () => number = Math.random): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i];
    result[i] = result[j]!;
    result[j] = temp!;
  }
  return result;
}

export function dealCards(
  playerCount: 2 | 3 | 4,
  random: () => number = Math.random,
): Card[][] {
  const deck = shuffleDeck(createDeck(), random);
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const cardsPerPlayer = Math.floor(52 / playerCount);

  for (let i = 0; i < cardsPerPlayer * playerCount; i += 1) {
    hands[i % playerCount]!.push(deck[i]!);
  }

  return hands;
}

export function findThreeOfSpadesHolder(hands: Card[][]): number {
  for (let i = 0; i < hands.length; i += 1) {
    if (hands[i]!.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades)) {
      return i;
    }
  }
  return 0;
}
