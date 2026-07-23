import {
  canBeat,
  identifyCombination,
  CombinationType,
  formatCard,
  compareCards,
  type Card,
  type Combination,
} from '@tien-len/shared';
import type { Dictionary } from './i18n';

/** Explain why selected cards cannot be played (before / instead of silent fail). */
export function explainPlayFailure(
  cards: Card[],
  current: Combination | null,
  allowFiveConsecutivePairs: boolean,
  dict: Dictionary,
): string | null {
  if (cards.length === 0) {
    return dict.playErrorEmpty;
  }

  const combination = identifyCombination(cards);
  if (!combination) {
    if (cards.length >= 3) {
      return dict.playErrorInvalidStraight;
    }
    return dict.playErrorInvalid;
  }

  if (
    !allowFiveConsecutivePairs &&
    combination.type === CombinationType.FiveConsecutivePairs
  ) {
    return dict.playErrorFivePairsOff;
  }

  if (!current) {
    return null;
  }

  if (canBeat(combination, current, allowFiveConsecutivePairs)) {
    return null;
  }

  if (
    combination.type === CombinationType.Straight &&
    current.type === CombinationType.Straight &&
    combination.length !== current.length
  ) {
    return dict.playErrorStraightLength.replace('{n}', String(current.length));
  }

  if (combination.type !== current.type) {
    return dict.playErrorWrongType;
  }

  // Same type (and same straight length) but not higher — show exact comparison
  const yours = formatCard(combination.highestCard);
  const theirs = formatCard(current.highestCard);
  const cmp = compareCards(combination.highestCard, current.highestCard);
  if (cmp === 0) {
    return dict.playErrorEqual
      .replace('{yours}', yours)
      .replace('{theirs}', theirs);
  }
  return dict.playErrorSmaller
    .replace('{yours}', yours)
    .replace('{theirs}', theirs);
}

/** Map server English errors to local dictionary when possible. */
export function localizeServerPlayError(message: string, dict: Dictionary): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid combination') || lower.includes('រាង')) {
    return dict.playErrorInvalidStraight;
  }
  if (lower.includes('match length') || lower.includes('straight must match')) {
    const match = message.match(/(\d+)/);
    return dict.playErrorStraightLength.replace('{n}', match?.[1] ?? '?');
  }
  if (lower.includes('same combination type') || lower.includes('valid chop')) {
    return dict.playErrorWrongType;
  }
  if (lower.includes('too small') || lower.includes('not higher') || lower.includes('cannot beat')) {
    const yours = message.match(/yours\s+([^\s,]+)/i)?.[1];
    const theirs = message.match(/table has\s+([^\s.]+)/i)?.[1];
    if (yours && theirs) {
      return dict.playErrorSmaller.replace('{yours}', yours).replace('{theirs}', theirs);
    }
    return dict.playErrorNotHigher;
  }
  if (lower.includes('not your turn')) {
    return dict.playErrorNotTurn;
  }
  if (lower.includes('cards not in hand')) {
    return dict.playErrorNotInHand;
  }
  if (lower.includes('five consecutive')) {
    return dict.playErrorFivePairsOff;
  }
  return message;
}
