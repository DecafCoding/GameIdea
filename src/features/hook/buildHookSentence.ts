/**
 * The hook sentence builder (hook-sentence in docs/architecture.html): turns a Hook Card's
 * stack, in reading order, into the one or two sentences the Hook Card shows and copies.
 * Pure: no React, no React Flow, no storage. Computed on every change and never stored.
 * Rules (docs/mvp-plan.html, Hook sentence rules; design 9.5):
 * - a blank entry and every Modifier entry are left out (a loose Modifier joins the
 *   sentence only through combine or On Top), so no slot is ever blank;
 * - each entry adds its connector word, then its text;
 * - Mood, Twist and Progression start a new sentence;
 * - a Conflict with a connector takes a comma before it;
 * - each sentence starts with a capital letter and ends with a period, unless it already
 *   ends in ".", "!" or "?".
 */
import type { Deck } from '@/shared/model';

/** One card of the stack: its deck, the shown connector word above it, and its text. */
export interface StackEntry {
  type: Deck;
  /** The badge word on the seam above this card as shown ("a" / "an" already resolved). */
  connector: string | null;
  activeText: string;
}

/** The decks whose entry opens a new sentence. */
const NEW_SENTENCE: readonly Deck[] = ['mood', 'twist', 'progression'];

function finish(sentence: string): string {
  const text = sentence.trim();
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}

/** The hook sentence for a stack in reading order; "" for an empty stack. */
export function buildHookSentence(stack: readonly StackEntry[]): string {
  const sentences: string[] = [];
  let current = '';
  for (const entry of stack) {
    const text = entry.activeText.trim();
    if (entry.type === 'modifier' || text === '') continue;
    if (NEW_SENTENCE.includes(entry.type) && current !== '') {
      sentences.push(current);
      current = '';
    }
    const part = entry.connector ? `${entry.connector} ${text}` : text;
    if (current === '') current = part;
    else if (entry.type === 'conflict' && entry.connector) current = `${current}, ${part}`;
    else current = `${current} ${part}`;
  }
  if (current !== '') sentences.push(current);
  return sentences.map(finish).join(' ');
}
