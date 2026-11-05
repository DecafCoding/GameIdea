/**
 * The pure pick rule for the Questions panel (docs/feature-questions-panel.html Pick rule):
 * never an answered question; a skipped question does not come back until every other
 * unanswered question was shown; never the current question when another exists; null
 * when every question is answered. The seen list is view state the caller keeps; this
 * function returns the updated list and never mutates its input.
 */

export interface PickInput {
  /** Question texts in file order. */
  pool: readonly string[];
  /** Question texts answered on the board. */
  answered: ReadonlySet<string>;
  /** Shown since the cycle began, current included. */
  seen: readonly string[];
  current: string | null;
}

export interface Pick {
  question: string;
  seen: string[];
}

/** Picks the next question; null when every pool question is answered. */
export function pickQuestion(input: PickInput, random: () => number = Math.random): Pick | null {
  const candidates = [...new Set(input.pool)].filter((text) => !input.answered.has(text));
  if (candidates.length === 0) return null;
  const notCurrent = candidates.filter((text) => text !== input.current);
  const others = notCurrent.length > 0 ? notCurrent : candidates;
  let seen: readonly string[] = input.seen;
  let unseen = others.filter((text) => !seen.includes(text));
  if (unseen.length === 0) {
    // The cycle ends: every other unanswered question was shown.
    seen = [];
    unseen = others;
  }
  const n = unseen.length;
  const question = unseen[Math.min(n - 1, Math.floor(random() * n))]!;
  const kept = new Set(candidates);
  return { question, seen: [...seen.filter((text) => kept.has(text)), question] };
}
