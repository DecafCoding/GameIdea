/**
 * Tests for the Questions panel's place: its saved place, the start place below the Core
 * Loop card, and pinQuestions and moveQuestions, so it moves on its own.
 */
import { describe, expect, it } from 'vitest';
import type { Board } from '@/shared/model';
import { fixtureBoard, onePagerBoard, onePagerWithLoop } from '@/test/fixtures/boards';
import { moveQuestions, pinQuestions, questionsPlace } from './questionsPlace';

const withLoopAt = (board: Board, x: number, y: number): Board => ({
  ...board,
  cards: board.cards.map((c) => (c.type === 'loop' ? { ...c, x, y } : c)),
});

describe('questionsPlace', () => {
  it('questionsPlace_loopCard_264BelowItsTop', () => {
    expect(questionsPlace(onePagerWithLoop())).toEqual({ x: 624, y: 96 + 264 });
  });

  it('questionsPlace_noLoopCard_belowDefaultLoopSpot', () => {
    expect(questionsPlace(onePagerBoard())).toEqual({ x: 624, y: 96 + 264 });
  });

  it('questionsPlace_savedPos_usedAndLoopMoveIgnored', () => {
    const board = { ...onePagerWithLoop(), questionsPos: { x: 960, y: 600 } };
    expect(questionsPlace(board)).toEqual({ x: 960, y: 600 });
    expect(questionsPlace(withLoopAt(board, 0, 0))).toEqual({ x: 960, y: 600 });
  });

  it('questionsPlace_freeForm_null', () => {
    expect(questionsPlace(fixtureBoard([]))).toBeNull();
  });
});

describe('pinQuestions', () => {
  it('pinQuestions_loopMovedWithNoSavedPlace_panelKeepsOldPlace', () => {
    const before = onePagerWithLoop();
    const pinned = pinQuestions(before, withLoopAt(before, 1000, 480));
    expect(pinned.questionsPos).toEqual({ x: 624, y: 360 });
    expect(questionsPlace(pinned)).toEqual({ x: 624, y: 360 });
  });

  it('pinQuestions_loopNotMovedOrPlaceSaved_sameBoard', () => {
    const before = onePagerWithLoop();
    expect(pinQuestions(before, before)).toBe(before);
    const saved = { ...before, questionsPos: { x: 960, y: 600 } };
    const moved = withLoopAt(saved, 1000, 480);
    expect(pinQuestions(saved, moved)).toBe(moved);
  });
});

describe('moveQuestions', () => {
  it('moveQuestions_newPlace_savesQuestionsPos', () => {
    const next = moveQuestions(onePagerWithLoop(), 912, 480);
    expect(next.questionsPos).toEqual({ x: 912, y: 480 });
  });

  it('moveQuestions_samePlaceOrFreeForm_sameBoard', () => {
    const moved = moveQuestions(onePagerWithLoop(), 912, 480);
    expect(moveQuestions(moved, 912, 480)).toBe(moved);
    const free = fixtureBoard([]);
    expect(moveQuestions(free, 912, 480)).toBe(free);
  });
});
