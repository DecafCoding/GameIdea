/**
 * Connector words between tucked cards (docs/mvp-plan.html, Connector badges; design 9.6).
 * A stack reads top to bottom as a sentence: "lighthouse keeper to keep the light on but
 * the tide rises every night". The words depend only on the 2 card types, keyed by the
 * lower card.
 *
 * Each pair has a short word list, default first. The writer picks a word on the badge
 * and it is saved on the tucked card. The badge shows the saved word while it is in the
 * pair's current list, and the default otherwise, so re-tucking a card never needs a
 * write, and tucking it back brings the saved word back.
 *
 * A word ending in " a" is written "a" or "an" by the first letter of the tucked card's
 * active text.
 */
import type { CardType } from '@/shared/model';

/** The card tucked directly below another: what its connector depends on. */
export interface Below {
  type: CardType;
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

const SAME_ROLE = ['and a', 'with a'];
const SAME_DECK = ['and'];
const GOAL = ['to', 'until', 'so you can'];
const CONFLICT = ['but', 'while', 'even though'];
const SETTING = ['in the', 'aboard the', 'inside the'];

/**
 * The word list for a pair, default first, or null when the pair has no badge. The
 * same-deck rule comes first. A Player Role under another deck and a Modifier under any
 * card have no badge: a Modifier over a card is its adjectives, not a new part of the
 * sentence.
 */
export function connectorWords(upper: CardType, lower: CardType): string[] | null {
  if (upper === lower) {
    if (lower === 'role') return SAME_ROLE;
    return lower === 'modifier' ? null : SAME_DECK;
  }
  switch (lower) {
    case 'goal':
      return GOAL;
    case 'conflict':
      return CONFLICT;
    case 'setting':
      return SETTING;
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
  const words = connectorWords(upper, below.type);
  if (!words) return null;
  const word = below.saved !== null && words.includes(below.saved) ? below.saved : words[0]!;
  return {
    word,
    text: showWord(word, below.text),
    options: words.map((w) => ({ word: w, text: showWord(w, below.text) })),
    type: below.type,
  };
}
