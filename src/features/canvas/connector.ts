/**
 * Connector words between tucked cards. A stack reads top to bottom as a sentence:
 * "navigator wants to burn the shipyards but the power runs out at dawn".
 *
 * Each pair has a short word list, default first. The writer picks a word on the badge
 * and it is saved on the tucked card. The badge shows the saved word while it is in the
 * pair's current list, and the default otherwise, so turning a Setting to another kind or
 * re-tucking a card never needs a write, and turning back brings the saved word back.
 *
 * A word ending in " a" is written "a" or "an" by the first letter of the tucked card's
 * active text.
 */
import type { CardType, CueKind } from '@/shared/model';

/** The card tucked directly below another: what its connector depends on. */
export interface Below {
  type: CardType;
  /** Kind of its active noun (Setting only). */
  kind: CueKind | null;
  /** Its active text, as the stack reads it: "exiled outpost". */
  text: string;
  /** The word saved on it, if any. */
  saved: string | null;
}

export interface ConnectorOption {
  /** The stored word: "in a". */
  word: string;
  /** As shown before this card's text: "in an". */
  text: string;
}

export interface Connector {
  /** The word in use (stored form). */
  word: string;
  /** The word in use as shown. */
  text: string;
  /** Every word for this pair, default first. */
  options: ConnectorOption[];
  /** The tucked (lower) card's type: the badge uses its color. */
  type: CardType;
}

const GOAL = ['wants to', 'needs to', 'must', 'refuses to', 'swore to', 'is afraid to'];
const CONFLICT = ['but', 'until', 'because', 'while', 'unless', 'even though'];
const ROLE = ['and', 'against', 'hunted by', 'working for', 'owes', 'betrays'];
const SETTING: Record<CueKind, string[]> = {
  place: ['in the', 'in a', 'on the', 'aboard the', 'beneath the', 'outside the'],
  object: ['with the', 'with a', 'for the', 'without the', 'hunting the', 'guarding the'],
  event: ['from the', 'from a', 'after the', 'during the', 'before the', 'despite the'],
};

/** The word list for a pair, default first, or null when the pair has no connector. */
export function connectorWords(
  upper: CardType,
  lower: CardType,
  kind: CueKind | null,
): string[] | null {
  switch (lower) {
    case 'conflict':
      return CONFLICT;
    case 'setting':
      // A Modifier over a Setting is its adjectives, not a new part of the sentence.
      return upper === 'modifier' || !kind ? null : SETTING[kind];
    case 'goal':
      return upper === 'role' ? GOAL : null;
    case 'role':
      return upper === 'role' ? ROLE : null;
    default:
      return null;
  }
}

/** "in a" before "exiled outpost" stays "in a"; before "orbital dock" it becomes "in an". */
export function showWord(word: string, next: string): string {
  return word.endsWith(' a') && /^[aeiou]/i.test(next.trim()) ? `${word}n` : word;
}

/** The connector between a card and the card tucked directly below it, or null. */
export function connectorFor(upper: CardType, below: Below): Connector | null {
  const words = connectorWords(upper, below.type, below.kind);
  if (!words) return null;
  const word = below.saved !== null && words.includes(below.saved) ? below.saved : words[0]!;
  return {
    word,
    text: showWord(word, below.text),
    options: words.map((w) => ({ word: w, text: showWord(w, below.text) })),
    type: below.type,
  };
}
