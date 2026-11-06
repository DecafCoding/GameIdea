/**
 * Tests for the pure pickQuestion rule.
 */
import { describe, expect, it } from 'vitest';
import { pickQuestion, type Pick, type PickInput } from './pickQuestion';

const POOL = ['A?', 'B?', 'C?', 'D?'];

const input = (overrides: Partial<PickInput> = {}): PickInput => ({
  pool: POOL,
  answered: new Set(),
  seen: [],
  current: null,
  ...overrides,
});

/** A repeating random sequence. */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('pickQuestion', () => {
  it('pickQuestion_answeredQuestions_neverPicked', () => {
    const answered = new Set(['A?', 'C?']);
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const pick = pickQuestion(input({ answered }), () => r);
      expect(['B?', 'D?']).toContain(pick?.question);
    }
  });

  it('pickQuestion_seenQuestion_notRepeatedBeforeCycleEnds', () => {
    const pool = Array.from({ length: 12 }, (_, i) => `Q${i}?`);
    const answered = new Set(['Q3?', 'Q7?']);
    const random = sequence([0.1, 0.9, 0.5, 0.3, 0.7, 0]);
    let seen: string[] = [];
    let current: string | null = null;
    const shown: string[] = [];
    for (let i = 0; i < 60; i++) {
      const pick: Pick = pickQuestion({ pool, answered, seen, current }, random)!;
      shown.push(pick.question);
      seen = pick.seen;
      current = pick.question;
    }
    const unanswered = pool.filter((q) => !answered.has(q));
    // Every unanswered question once per cycle of 10 picks.
    for (let start = 0; start < 60; start += 10) {
      expect(new Set(shown.slice(start, start + 10))).toEqual(new Set(unanswered));
    }
    expect(shown.some((q) => answered.has(q))).toBe(false);
  });

  it('pickQuestion_cycleEnd_clearsSeen', () => {
    const pick = pickQuestion(input({ seen: [...POOL], current: 'D?' }), () => 0)!;
    expect(pick.question).toBe('A?');
    expect(pick.seen).toEqual(['A?']);
  });

  it('pickQuestion_current_neverReturnedWhenAnotherExists', () => {
    for (const r of [0, 0.5, 0.99]) {
      const pick = pickQuestion(input({ seen: [...POOL], current: 'B?' }), () => r)!;
      expect(pick.question).not.toBe('B?');
    }
    const two = pickQuestion(input({ answered: new Set(['A?', 'D?']), current: 'B?' }), () => 0);
    expect(two?.question).toBe('C?');
  });

  it('pickQuestion_oneCandidate_returnsIt', () => {
    const answered = new Set(['A?', 'B?', 'C?']);
    const pick = pickQuestion(input({ answered, seen: ['D?'], current: 'D?' }), () => 0.5);
    expect(pick).toEqual({ question: 'D?', seen: ['D?'] });
  });

  it('pickQuestion_allAnswered_returnsNull', () => {
    expect(pickQuestion(input({ answered: new Set(POOL) }))).toBeNull();
    expect(pickQuestion(input({ pool: [] }))).toBeNull();
  });

  it('pickQuestion_randomOne_staysInRange', () => {
    const pick = pickQuestion(input(), () => 1);
    expect(pick?.question).toBe('D?');
  });

  it('pickQuestion_input_notMutated', () => {
    const seen = ['A?'];
    const answered = new Set(['B?']);
    pickQuestion(input({ seen, answered, current: 'A?' }), () => 0);
    expect(seen).toEqual(['A?']);
    expect([...answered]).toEqual(['B?']);
  });
});
