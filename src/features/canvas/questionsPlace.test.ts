/**
 * Tests for the Questions panel's place below the Core Loop card.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, onePagerBoard, onePagerWithLoop } from '@/test/fixtures/boards';
import { questionsPlace } from './questionsPlace';

describe('questionsPlace', () => {
  it('questionsPlace_loopCard_belowWith24Gap', () => {
    expect(questionsPlace(onePagerWithLoop())).toEqual({ x: 680, y: 96 + 200 + 24 });
  });

  it('questionsPlace_measuredHeight_used', () => {
    expect(questionsPlace(onePagerWithLoop(), 312)).toEqual({ x: 680, y: 96 + 312 + 24 });
  });

  it('questionsPlace_movedLoopCard_follows', () => {
    const board = onePagerWithLoop();
    const moved = {
      ...board,
      cards: board.cards.map((c) => (c.id === 'loop-1' ? { ...c, x: 1000, y: 480 } : c)),
    };
    expect(questionsPlace(moved)).toEqual({ x: 1000, y: 480 + 200 + 24 });
  });

  it('questionsPlace_noLoopCard_defaultSpot', () => {
    expect(questionsPlace(onePagerBoard())).toEqual({ x: 680, y: 96 });
  });

  it('questionsPlace_freeForm_null', () => {
    expect(questionsPlace(fixtureBoard([]))).toBeNull();
  });
});
