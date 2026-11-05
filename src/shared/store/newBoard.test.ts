/**
 * Tests for newBoard's 2 kinds: a Free Form board starts empty with no conceptWidth key,
 * a One-Pager board starts with exactly 1 Hook Card, 1 Core Loop card and the default
 * Concept width.
 */
import { describe, expect, it } from 'vitest';
import { CONCEPT_WIDTH } from '@/shared/model';
import { newBoard, ONE_PAGER_HOOK_SPOT, ONE_PAGER_LOOP_SPOT } from './newBoard';

describe('newBoard kinds', () => {
  it('newBoard_default_isFreeFormWithNoCards', () => {
    const board = newBoard();
    expect(board.kind).toBe('free');
    expect(board.cards).toEqual([]);
  });

  it('newBoard_onePager_hookAndOneLoopCard', () => {
    const board = newBoard({ kind: 'onePager', hookId: 'hook-a', loopId: 'loop-a' });
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
      {
        id: 'loop-a',
        type: 'loop',
        x: 680,
        y: 96,
        z: 2,
        tuckedUnder: null,
        rings: [],
        onTopOf: null,
        locked: false,
        inConcept: false,
      },
    ]);
    expect('loopText' in board.cards[1]!).toBe(false);
  });

  it('newBoard_onePager_loopSpotRightOfDefaultPanel', () => {
    expect(ONE_PAGER_LOOP_SPOT.x).toBe(
      ONE_PAGER_HOOK_SPOT.x + 240 + 56 + CONCEPT_WIDTH.default + 56,
    );
    expect(ONE_PAGER_LOOP_SPOT.y).toBe(ONE_PAGER_HOOK_SPOT.y);
  });

  it('newBoard_freeForm_noLoopCard', () => {
    expect(newBoard({ kind: 'free' }).cards.some((card) => card.type === 'loop')).toBe(false);
  });

  it('newBoard_onePager_defaultConceptWidth', () => {
    expect(newBoard({ kind: 'onePager' }).conceptWidth).toBe(CONCEPT_WIDTH.default);
  });

  it('newBoard_freeForm_noConceptWidthKey', () => {
    expect('conceptWidth' in newBoard({ kind: 'free' })).toBe(false);
  });
});
