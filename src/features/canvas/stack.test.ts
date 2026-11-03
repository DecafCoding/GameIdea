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
  secondModifier,
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
  it('stackOrder_chain_roleGoalConflictAt0And56And112', () => {
    const board = tuckCard(
      tuckCard(
        fixtureBoard([
          fixtureCard('role', { x: 100, y: 100, z: 1 }),
          fixtureCard('goal', { x: 500, y: 0, z: 2 }),
          fixtureCard('conflict', { x: 900, y: 0, z: 3 }),
        ]),
        'goal-1',
        'role-1',
      ),
      'conflict-1',
      'goal-1',
    );
    expect(stackOrder(board, 'role-1').map((c) => c.id)).toEqual([
      'role-1',
      'goal-1',
      'conflict-1',
    ]);
    expect(ys(board, ['role-1', 'goal-1', 'conflict-1'])).toEqual([100, 156, 212]);
    expect(find(board, 'conflict-1').x).toBe(100);
    expect(stackDepth(board, 'conflict-1')).toBe(2);
  });

  it('childrenOf_modifierTuckedLater_sitsClosestToParent', () => {
    const board = fixtureBoard([
      fixtureCard('role', { z: 1 }),
      fixtureCard('goal', { z: 2, tuckedUnder: 'role-1' }),
      fixtureCard('modifier', { z: 3, tuckedUnder: 'role-1' }),
    ]);
    expect(childrenOf(board, 'role-1').map((c) => c.type)).toEqual(['modifier', 'goal']);
  });
});

describe('tuckCard', () => {
  it('tuckCard_ontoOwnDescendant_throws', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    expect(() => tuckCard(board, 'role-1', 'conflict-1')).toThrow();
    expect(() => tuckCard(board, 'role-1', 'role-1')).toThrow();
  });

  it('tuckCard_card_getsNextZAndKeepsSubtree', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('setting', { id: 'setting-1', x: 400, y: 400, z: 10 }),
    ]);
    const next = tuckCard(board, 'goal-1', 'setting-1');
    expect(find(next, 'goal-1')).toMatchObject({ tuckedUnder: 'setting-1', z: 11 });
    expect(ys(next, ['goal-1', 'conflict-1'])).toEqual([456, 512]);
    expect(stackOrder(next, 'role-1')).toHaveLength(1);
  });
});

describe('moveCard', () => {
  it('moveCard_root_movesWholeStack', () => {
    const next = moveCard(fixtureBoard(fixtureStack(0, 0)), 'role-1', 300, 200);
    expect(next.cards.map((c) => [c.x, c.y])).toEqual([
      [300, 200],
      [300, 256],
      [300, 312],
    ]);
  });

  it('moveCard_tuckedCard_throws', () => {
    expect(() => moveCard(fixtureBoard(fixtureStack(0, 0)), 'conflict-1', 1, 1)).toThrow();
  });
});

describe('putOnTop', () => {
  const story = () =>
    fixtureBoard([
      combinedCard('role', { x: 96, y: 96, z: 1 }),
      fixtureCard('goal', { x: 96, y: 152, z: 2, tuckedUnder: 'role-1' }),
      secondModifier({ x: 600, y: 96, z: 3 }),
    ]);

  it('putOnTop_rootTarget_takesItsPlaceAndPushesStackDown', () => {
    const next = putOnTop(story(), 'modifier-2', 'role-1');
    expect(find(next, 'modifier-2')).toMatchObject({ tuckedUnder: null, x: 96, y: 96 });
    expect(find(next, 'role-1')).toMatchObject({ tuckedUnder: 'modifier-2', x: 96 });
    expect(stackOrder(next, 'modifier-2').map((c) => c.id)).toEqual([
      'modifier-2',
      'role-1',
      'goal-1',
    ]);
    expect(ys(next, ['modifier-2', 'role-1', 'goal-1'])).toEqual([96, 152, 208]);
  });

  it('putOnTop_modifierTuckedUnderTarget_movesToTop', () => {
    const board = tuckCard(story(), 'modifier-2', 'role-1');
    const next = putOnTop(board, 'modifier-2', 'role-1');
    expect(stackOrder(next, 'modifier-2').map((c) => c.id)).toEqual([
      'modifier-2',
      'role-1',
      'goal-1',
    ]);
    expect(ys(next, ['modifier-2', 'role-1', 'goal-1'])).toEqual([96, 152, 208]);
  });

  it('putOnTop_tuckedTarget_takesTargetSlotUnderParent', () => {
    const board = fixtureBoard([
      fixtureCard('conflict', { x: 0, y: 0, z: 1 }),
      combinedCard('setting', { x: 0, y: 56, z: 2, tuckedUnder: 'conflict-1' }),
      secondModifier({ x: 600, y: 0, z: 3 }),
    ]);
    const next = putOnTop(board, 'modifier-2', 'setting-1');
    expect(find(next, 'modifier-2').tuckedUnder).toBe('conflict-1');
    expect(stackOrder(next, 'conflict-1').map((c) => c.id)).toEqual([
      'conflict-1',
      'modifier-2',
      'setting-1',
    ]);
    expect(ys(next, ['conflict-1', 'modifier-2', 'setting-1'])).toEqual([0, 56, 112]);
  });

  it('putOnTop_ontoOwnDescendant_throws', () => {
    const board = tuckCard(story(), 'role-1', 'modifier-2');
    expect(() => putOnTop(board, 'modifier-2', 'role-1')).toThrow();
  });
});

describe('untuckCard', () => {
  it('untuckCard_middleCard_closesGapAndKeepsSubtree', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0),
      fixtureCard('modifier', { x: 0, y: 177, z: 4, tuckedUnder: 'conflict-1' }),
    ]);
    // Take the Goal (with the Conflict and Modifier under it) out.
    const next = untuckCard(board, 'goal-1', 600, 300);
    expect(find(next, 'goal-1')).toMatchObject({ tuckedUnder: null, x: 600, y: 300, z: 5 });
    expect(ys(next, ['conflict-1', 'modifier-1'])).toEqual([356, 412]);
    expect(stackOrder(next, 'role-1')).toHaveLength(1);
  });
});

describe('removeFromStacks', () => {
  it('removeFromStacks_rootWithChildren_childrenBecomeRoots', () => {
    const board = fixtureBoard([
      fixtureCard('role', { z: 1 }),
      fixtureCard('goal', { y: 56, z: 2, tuckedUnder: 'role-1' }),
      fixtureCard('conflict', { y: 112, z: 3, tuckedUnder: 'goal-1' }),
      fixtureCard('modifier', { y: 56, z: 4, tuckedUnder: 'role-1' }),
    ]);
    const next = removeFromStacks(board, 'role-1');
    expect(find(next, 'modifier-1')).toMatchObject({ tuckedUnder: null, y: 56 });
    expect(find(next, 'goal-1')).toMatchObject({ tuckedUnder: null });
    expect(find(next, 'conflict-1')).toMatchObject({ tuckedUnder: 'goal-1' });
    expect(find(next, 'conflict-1').y).toBe(find(next, 'goal-1').y + 56);
  });

  it('removeFromStacks_middleCard_childrenMoveUp', () => {
    const next = removeFromStacks(fixtureBoard(fixtureStack(0, 0)), 'goal-1');
    expect(find(next, 'conflict-1')).toMatchObject({ tuckedUnder: 'role-1', y: 56 });
    expect(find(next, 'goal-1').tuckedUnder).toBeNull();
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
