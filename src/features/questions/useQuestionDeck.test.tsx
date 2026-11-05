/**
 * Tests for the Questions panel's view state hook.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useQuestionDeck } from './useQuestionDeck';

const POOL = ['A?', 'B?', 'C?', 'D?'];
const NONE: ReadonlySet<string> = new Set();
/** Always the first unseen candidate. */
const first = () => 0;

interface Props {
  pool: readonly string[] | null;
  answered: ReadonlySet<string>;
  boardId: string;
}

function setup(initial: Partial<Props> = {}) {
  const props: Props = { pool: POOL, answered: NONE, boardId: 'b1', ...initial };
  return renderHook((p: Props) => useQuestionDeck(p.pool, p.answered, p.boardId, first), {
    initialProps: props,
  });
}

describe('useQuestionDeck', () => {
  it('useQuestionDeck_poolReady_picksFirstQuestion', () => {
    const { result, rerender } = setup({ pool: null });
    expect(result.current.current).toBeNull();
    rerender({ pool: POOL, answered: NONE, boardId: 'b1' });
    expect(result.current.current).toBe('A?');
    expect(result.current.allAnswered).toBe(false);
  });

  it('useQuestionDeck_next_neverRepeatsBeforeCycleEnds', () => {
    const { result } = setup();
    const shown = [result.current.current];
    for (let i = 0; i < 3; i++) {
      act(() => result.current.next());
      shown.push(result.current.current);
    }
    expect(new Set(shown)).toEqual(new Set(POOL));
    act(() => result.current.next());
    expect(result.current.current).not.toBe(shown[3]);
  });

  it('useQuestionDeck_next_keepsDraft', () => {
    const { result } = setup();
    act(() => result.current.setDraft('half'));
    act(() => result.current.next());
    expect(result.current.draft).toBe('half');
  });

  it('useQuestionDeck_saved_clearsDraftAndPicksAnother', () => {
    const { result } = setup();
    act(() => result.current.setDraft('An answer.'));
    act(() => result.current.saved());
    expect(result.current.draft).toBe('');
    expect(result.current.current).toBe('B?');
  });

  it('useQuestionDeck_currentAnsweredElsewhere_picksAgain', () => {
    const { result, rerender } = setup();
    expect(result.current.current).toBe('A?');
    rerender({ pool: POOL, answered: new Set(['A?']), boardId: 'b1' });
    expect(result.current.current).toBe('B?');
  });

  it('useQuestionDeck_allAnswered_currentNullAndFlagTrue', () => {
    const { result, rerender } = setup();
    rerender({ pool: POOL, answered: new Set(POOL), boardId: 'b1' });
    expect(result.current.current).toBeNull();
    expect(result.current.allAnswered).toBe(true);
    // A delete frees a question: the deck shows it.
    rerender({ pool: POOL, answered: new Set(['A?', 'B?', 'D?']), boardId: 'b1' });
    expect(result.current.current).toBe('C?');
    expect(result.current.allAnswered).toBe(false);
  });

  it('useQuestionDeck_boardChange_resetsSeenAndDraft', () => {
    const { result, rerender } = setup();
    act(() => result.current.next());
    act(() => result.current.setDraft('half'));
    expect(result.current.current).toBe('B?');
    rerender({ pool: POOL, answered: NONE, boardId: 'b2' });
    expect(result.current.draft).toBe('');
    // A fresh seen list: the first pick is the first question again.
    expect(result.current.current).toBe('A?');
  });

  it('useQuestionDeck_poolNull_currentNull', () => {
    const { result } = setup({ pool: null });
    expect(result.current.current).toBeNull();
    expect(result.current.allAnswered).toBe(false);
    act(() => result.current.next());
    expect(result.current.current).toBeNull();
  });
});
