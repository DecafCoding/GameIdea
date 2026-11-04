/**
 * Tests for newBoard's 2 kinds: a Free Form board starts empty with no conceptWidth key,
 * a One-Pager board starts with exactly 1 Hook Card and the default Concept width.
 */
import { describe, expect, it } from 'vitest';
import { CONCEPT_WIDTH } from '@/shared/model';
import { newBoard, ONE_PAGER_HOOK_SPOT } from './newBoard';

describe('newBoard kinds', () => {
  it('newBoard_default_isFreeFormWithNoCards', () => {
    const board = newBoard();
    expect(board.kind).toBe('free');
    expect(board.cards).toEqual([]);
  });

  it('newBoard_onePager_hasExactlyOneHookCard', () => {
    const board = newBoard({ kind: 'onePager', hookId: 'hook-a' });
    expect(board.kind).toBe('onePager');
    expect(board.cards).toEqual([
      {
        id: 'hook-a',
        type: 'hook',
        x: ONE_PAGER_HOOK_SPOT.x,
        y: ONE_PAGER_HOOK_SPOT.y,
        z: 1,
        tuckedUnder: null,
        rings: [],
        onTopOf: null,
        locked: false,
        inConcept: false,
      },
    ]);
  });

  it('newBoard_onePager_defaultConceptWidth', () => {
    expect(newBoard({ kind: 'onePager' }).conceptWidth).toBe(CONCEPT_WIDTH.default);
  });

  it('newBoard_freeForm_noConceptWidthKey', () => {
    expect('conceptWidth' in newBoard({ kind: 'free' })).toBe(false);
  });
});
