/**
 * Tests for the stack logic: order, layout, tuck, untuck, move, removal and next z.
 */
import { describe, expect, it } from 'vitest';
import type { Board, Card } from '@/shared/model';
import { fixtureBoard, fixtureCard, fixtureStack } from '@/test/fixtures/boards';
import {
  childrenOf,
  layoutStack,
  moveCard,
  nextZ,
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

describe('layoutStack with a Hook Card', () => {
  it('layoutStack_hookRoot_insetsCards20', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { x: 96, y: 48 }),
      fixtureCard('role', { x: 0, y: 0, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('mechanic', { x: 0, y: 0, z: 3, tuckedUnder: 'role-1' }),
    ]);
    const next = layoutStack(board, 'hook-1');
    expect(next.cards.map((c) => [c.x, c.y])).toEqual([
      [96, 48],
      [116, 104],
      [116, 160],
    ]);
  });
});
