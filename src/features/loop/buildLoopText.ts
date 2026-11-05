/**
 * The Core Loop live text builder (docs/feature-core-loop-card.html, Live template): turns
 * the 4 loop steps into the template parts and the plain text
 * "[Mechanic] → earn [Resource] → [Progression] → to [Goal]". A missing step is left out,
 * with no doubled, leading or trailing arrow. Pure: no React, no React Flow, no storage.
 * Like the hook sentence (hook-sentence in docs/architecture.html), the live text is
 * computed on every change and never stored.
 */

/** The 4 loop steps in template order, each with its lead word. */
export const LOOP_STEPS = [
  { deck: 'mechanic', lead: '' },
  { deck: 'resource', lead: 'earn' },
  { deck: 'progression', lead: '' },
  { deck: 'goal', lead: 'to' },
] as const;

/** The deck of a loop step. */
export type LoopDeck = (typeof LOOP_STEPS)[number]['deck'];

/** The step texts the board gives; a missing step has no key. */
export type LoopSteps = Partial<Record<LoopDeck, string>>;

/** 1 filled step of the template: its deck, its lead word ('' for none) and its text. */
export interface LoopPart {
  deck: LoopDeck;
  lead: string;
  text: string;
}

/** The arrow between parts: U+2192 with 1 space each side. */
export const LOOP_ARROW = ' → ';

/** The template parts in order and the plain text; no steps gives no parts and ''. */
export function buildLoopText(steps: LoopSteps): { parts: LoopPart[]; text: string } {
  const parts: LoopPart[] = [];
  for (const { deck, lead } of LOOP_STEPS) {
    const text = steps[deck];
    if (text !== undefined && text.trim() !== '') parts.push({ deck, lead, text });
  }
  const text = parts.map((p) => (p.lead ? `${p.lead} ${p.text}` : p.text)).join(LOOP_ARROW);
  return { parts, text };
}
