/**
 * Tests for the stack logic: order, layout, tuck, untuck, move, removal and next z.
 */
import { describe, expect, it } from 'vitest';
import type { Board, Card } from '@/shared/model';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureStack,
  secondDescription,
} from '@/test/fixtures/boards';
import {
  childrenOf,
  moveCard,
  nextZ,
  putOnTop,
  removeFromStacks,
  stackDepth,
  stackOrder,
  tuckCard,
  untuckCard,
} from './stack';

const find = (board: Board, id: string): Card => board.cards.find((c) => c.id === id)!;
const ys = (board: Board, ids: string[]) => ids.map((id) => find(board, id).y);

describe('stackOrder', () => {
  it('stackOrder_chain_characterMotivationConflictAt0And59And118', () => {
    const board = tuckCard(
      tuckCard(
        fixtureBoard([
          fixtureCard('character', { x: 100, y: 100, z: 1 }),
          fixtureCard('motivation', { x: 500, y: 0, z: 2 }),
          fixtureCard('conflict', { x: 900, y: 0, z: 3 }),
        ]),
        'motivation-1',
        'character-1',
      ),
      'conflict-1',
      'motivation-1',
    );
    expect(stackOrder(board, 'character-1').map((c) => c.id)).toEqual([
      'character-1',
      'motivation-1',
      'conflict-1',
    ]);
    expect(ys(board, ['character-1', 'motivation-1', 'conflict-1'])).toEqual([100, 159, 218]);
    expect(find(board, 'conflict-1').x).toBe(100);
    expect(stackDepth(board, 'conflict-1')).toBe(2);
  });

  it('childrenOf_descriptionTuckedLater_sitsClosestToParent', () => {
    const board = fixtureBoard([
      fixtureCard('character', { z: 1 }),
      fixtureCard('motivation', { z: 2, tuckedUnder: 'character-1' }),
      fixtureCard('description', { z: 3, tuckedUnder: 'character-1' }),
    ]);
    expect(childrenOf(board, 'character-1').map((c) => c.type)).toEqual([
      'description',
      'motivation',
    ]);
  });
});

describe('tuckCard', () => {
  it('tuckCard_ontoOwnDescendant_throws', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    expect(() => tuckCard(board, 'character-1', 'conflict-1')).toThrow();
    expect(() => tuckCard(board, 'character-1', 'character-1')).toThrow();
  });

  it('tuckCard_card_getsNextZAndKeepsSubtree', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('setting', { id: 'setting-1', x: 400, y: 400, z: 10 }),
    ]);
    const next = tuckCard(board, 'motivation-1', 'setting-1');
    expect(find(next, 'motivation-1')).toMatchObject({ tuckedUnder: 'setting-1', z: 11 });
    expect(ys(next, ['motivation-1', 'conflict-1'])).toEqual([459, 518]);
    expect(stackOrder(next, 'character-1')).toHaveLength(1);
  });
});

describe('moveCard', () => {
  it('moveCard_root_movesWholeStack', () => {
    const next = moveCard(fixtureBoard(fixtureStack(0, 0)), 'character-1', 300, 200);
    expect(next.cards.map((c) => [c.x, c.y])).toEqual([
      [300, 200],
      [300, 259],
      [300, 318],
    ]);
  });

  it('moveCard_tuckedCard_throws', () => {
    expect(() => moveCard(fixtureBoard(fixtureStack(0, 0)), 'conflict-1', 1, 1)).toThrow();
  });
});

describe('putOnTop', () => {
  const story = () =>
    fixtureBoard([
      combinedCard('character', { x: 96, y: 96, z: 1 }),
      fixtureCard('motivation', { x: 96, y: 155, z: 2, tuckedUnder: 'character-1' }),
      secondDescription({ x: 600, y: 96, z: 3 }),
    ]);

  it('putOnTop_rootTarget_takesItsPlaceAndPushesStackDown', () => {
    const next = putOnTop(story(), 'description-2', 'character-1');
    expect(find(next, 'description-2')).toMatchObject({ tuckedUnder: null, x: 96, y: 96 });
    expect(find(next, 'character-1')).toMatchObject({ tuckedUnder: 'description-2', x: 96 });
    expect(stackOrder(next, 'description-2').map((c) => c.id)).toEqual([
      'description-2',
      'character-1',
      'motivation-1',
    ]);
    expect(ys(next, ['description-2', 'character-1', 'motivation-1'])).toEqual([96, 155, 214]);
  });

  it('putOnTop_descriptionTuckedUnderTarget_movesToTop', () => {
    const board = tuckCard(story(), 'description-2', 'character-1');
    const next = putOnTop(board, 'description-2', 'character-1');
    expect(stackOrder(next, 'description-2').map((c) => c.id)).toEqual([
      'description-2',
      'character-1',
      'motivation-1',
    ]);
    expect(ys(next, ['description-2', 'character-1', 'motivation-1'])).toEqual([96, 155, 214]);
  });

  it('putOnTop_tuckedTarget_takesTargetSlotUnderParent', () => {
    const board = fixtureBoard([
      fixtureCard('conflict', { x: 0, y: 0, z: 1 }),
      combinedCard('setting', { x: 0, y: 59, z: 2, tuckedUnder: 'conflict-1' }),
      secondDescription({ x: 600, y: 0, z: 3 }),
    ]);
    const next = putOnTop(board, 'description-2', 'setting-1');
    expect(find(next, 'description-2').tuckedUnder).toBe('conflict-1');
    expect(stackOrder(next, 'conflict-1').map((c) => c.id)).toEqual([
      'conflict-1',
      'description-2',
      'setting-1',
    ]);
    expect(ys(next, ['conflict-1', 'description-2', 'setting-1'])).toEqual([0, 59, 118]);
  });

  it('putOnTop_ontoOwnDescendant_throws', () => {
    const board = tuckCard(story(), 'character-1', 'description-2');
    expect(() => putOnTop(board, 'description-2', 'character-1')).toThrow();
  });
});

describe('untuckCard', () => {
  it('untuckCard_middleCard_closesGapAndKeepsSubtree', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('description', { x: 0, y: 177, z: 4, tuckedUnder: 'conflict-1' }),
    ]);
    // Take the Motivation (with the Conflict and Description under it) out.
    const next = untuckCard(board, 'motivation-1', 600, 300);
    expect(find(next, 'motivation-1')).toMatchObject({ tuckedUnder: null, x: 600, y: 300, z: 5 });
    expect(ys(next, ['conflict-1', 'description-1'])).toEqual([359, 418]);
    expect(stackOrder(next, 'character-1')).toHaveLength(1);
  });
});

describe('removeFromStacks', () => {
  it('removeFromStacks_rootWithChildren_childrenBecomeRoots', () => {
    const board = fixtureBoard([
      fixtureCard('character', { z: 1 }),
      fixtureCard('motivation', { y: 59, z: 2, tuckedUnder: 'character-1' }),
      fixtureCard('conflict', { y: 118, z: 3, tuckedUnder: 'motivation-1' }),
      fixtureCard('description', { y: 59, z: 4, tuckedUnder: 'character-1' }),
    ]);
    const next = removeFromStacks(board, 'character-1');
    expect(find(next, 'description-1')).toMatchObject({ tuckedUnder: null, y: 59 });
    expect(find(next, 'motivation-1')).toMatchObject({ tuckedUnder: null });
    expect(find(next, 'conflict-1')).toMatchObject({ tuckedUnder: 'motivation-1' });
    expect(find(next, 'conflict-1').y).toBe(find(next, 'motivation-1').y + 59);
  });

  it('removeFromStacks_middleCard_childrenMoveUp', () => {
    const next = removeFromStacks(fixtureBoard(fixtureStack(0, 0)), 'motivation-1');
    expect(find(next, 'conflict-1')).toMatchObject({ tuckedUnder: 'character-1', y: 59 });
    expect(find(next, 'motivation-1').tuckedUnder).toBeNull();
  });
});

describe('nextZ', () => {
  it('nextZ_emptyBoard_returns1', () => {
    expect(nextZ(fixtureBoard([]))).toBe(1);
  });

  it('nextZ_cards_returnsMaxPlusOne', () => {
    expect(nextZ(fixtureBoard(fixtureStack(0, 0, '1', 7)))).toBe(10);
  });
});
