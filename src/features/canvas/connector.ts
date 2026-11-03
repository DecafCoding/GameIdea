/**
 * Connector words between tucked cards (docs/mvp-plan.html, Connector badges; design 9.6).
 * A stack under a Hook Card reads top to bottom as a sentence: "You are a lighthouse
 * keeper who must trade using memories to keep the light on, but the tide rises every
 * night." The words depend only on the 2 card types, keyed by the lower card.
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

const ROLE_UNDER_HOOK = ['You are a', 'You play a'];
const SAME_ROLE = ['and a', 'with a'];
/** A Player Role under another deck: the table has no row, so its words are reused. */
const ROLE_UNDER_OTHER = ['with a', 'and a'];
const SAME_DECK = ['and'];

/** The word list by the lower card's deck, when it sits under another deck or the Hook Card. */
const WORDS: Partial<Record<CardType, string[]>> = {
  mechanic: ['who must', 'who can only', 'who learns to'],
  goal: ['to', 'until', 'so you can'],
  conflict: ['but', 'while', 'even though'],
  resource: ['using', 'while managing', 'spending'],
  setting: ['in the', 'aboard the', 'inside the'],
  mood: ['It feels', 'The tone is'],
  twist: ['Except', 'The catch:'],
  progression: ['As you play,', 'Over time,'],
  constraint: ['with', 'and'],
};

/**
 * The word list for a pair, default first, or null when the pair has no badge. A Modifier
 * never gets a badge: a Modifier over a card is its adjectives, not a new part of the
 * sentence. A Player Role reads "You are a" under the Hook Card, "and a" under another
 * Player Role and "with a" under any other card. Any other card under a card of its own
 * deck reads "and"; otherwise the lower card's deck picks the words.
 */
export function connectorWords(upper: CardType, lower: CardType): string[] | null {
  if (lower === 'modifier' || lower === 'hook') return null;
  if (lower === 'role') {
    if (upper === 'hook') return ROLE_UNDER_HOOK;
    return upper === 'role' ? SAME_ROLE : ROLE_UNDER_OTHER;
  }
  if (upper === lower) return SAME_DECK;
  return WORDS[lower] ?? null;
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
