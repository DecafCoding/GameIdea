/**
 * Tests for the drop target, the drop action and the drag hints.
 */
import { describe, expect, it } from 'vitest';
import type { Card } from '@/shared/model';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureStack,
  secondModifier,
  onePagerBoard,
  onePagerWithLoop,
} from '@/test/fixtures/boards';
import {
  dropAction,
  dropTarget,
  hintFor,
  isNormalPlace,
  tuckLanding,
  paintOrder,
} from './dropZones';

const modifier = fixtureCard('modifier', { x: 900, y: 900, z: 9 });

describe('dropTarget', () => {
  it('dropTarget_overlappingCards_returnsTopmost', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 0, y: 0, z: 1 }),
      fixtureCard('setting', { x: 100, y: 100, z: 2 }),
      modifier,
    ]);
    expect(dropTarget(board, modifier.id, { x: 150, y: 150 })?.id).toBe('setting-1');
    expect(dropTarget(board, modifier.id, { x: 50, y: 50 })?.id).toBe('role-1');
    expect(dropTarget(board, modifier.id, { x: 600, y: 600 })).toBeNull();
  });

  it('dropTarget_tuckedCardOverlap_returnsParent', () => {
    const board = fixtureBoard([...fixtureStack(0, 0), modifier]);
    expect(dropTarget(board, modifier.id, { x: 100, y: 150 })?.id).toBe('role-1');
    expect(dropTarget(board, modifier.id, { x: 100, y: 290 })?.id).toBe('conflict-1');
  });

  it('dropTarget_ownDescendant_skipped', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    expect(dropTarget(board, 'role-1', { x: 100, y: 340 })).toBeNull();
  });

  it('dropTarget_goalInSlotBand_hitsRole', () => {
    const board = fixtureBoard([
      fixtureCard('role', { x: 0, y: 0 }),
      fixtureCard('goal', { x: 900, y: 0, z: 2 }),
    ]);
    expect(dropTarget(board, 'goal-1', { x: 100, y: 260 })?.id).toBe('role-1');
    expect(dropTarget(board, 'goal-1', { x: 100, y: 290 })).toBeNull();
  });
});

describe('dropAction', () => {
  const role = fixtureCard('role', { x: 0, y: 0 });
  const combined = combinedCard('role', { x: 0, y: 0 });
  const on = (...cards: Card[]) => fixtureBoard(cards);

  it('dropAction_modifierOnUncombinedRole_combine', () => {
    expect(dropAction(on(role), modifier, role, { x: 10, y: 10 })).toEqual({ kind: 'combine' });
  });

  it('dropAction_modifierOnResource_combine', () => {
    const resource = fixtureCard('resource');
    expect(dropAction(on(resource), modifier, resource, { x: 5, y: 5 })).toEqual({
      kind: 'combine',
    });
  });

  it('dropAction_centerOfMergedCard_isSwap', () => {
    expect(dropAction(on(combined), modifier, combined, { x: 100, y: 118 })).toEqual({
      kind: 'swap',
    });
    // Outside the drawn circle but below the top band still swaps.
    expect(dropAction(on(combined), modifier, combined, { x: 10, y: 190 })).toEqual({
      kind: 'swap',
    });
  });

  it('dropAction_topBandOfMergedCard_isOnTop', () => {
    expect(dropAction(on(combined), modifier, combined, { x: 100, y: 20 })).toEqual({
      kind: 'onTop',
    });
    expect(dropAction(on(combined), modifier, combined, { x: 10, y: 51 })).toEqual({
      kind: 'onTop',
    });
  });

  it('dropAction_mergedCardWithOnTop_isSwapEverywhere', () => {
    const onTop = secondModifier({ onTopOf: 'role-1' });
    const board = on(combined, onTop);
    expect(dropAction(board, modifier, combined, { x: 100, y: 20 })).toEqual({ kind: 'swap' });
    expect(hintFor(board, modifier, combined, { x: 100, y: 20 })).toBe('swapOnly');
  });

  it('dropAction_baseWithOnTopNoMerge_combines', () => {
    const onTop = secondModifier({ onTopOf: 'role-1' });
    expect(dropAction(on(role, onTop), modifier, role, { x: 100, y: 20 })).toEqual({
      kind: 'combine',
    });
  });

  it('dropAction_modifierOnMechanic_tucks', () => {
    const mechanic = fixtureCard('mechanic');
    expect(dropAction(on(mechanic), modifier, mechanic, { x: 100, y: 100 })).toEqual({
      kind: 'tuck',
    });
    expect(hintFor(on(mechanic), modifier, mechanic, { x: 100, y: 100 })).toBe('slot');
  });

  it('dropAction_goalOnSetting_tuck', () => {
    const setting = fixtureCard('setting');
    expect(dropAction(on(setting), fixtureCard('goal'), setting, { x: 5, y: 5 })).toEqual({
      kind: 'tuck',
    });
  });

  it('dropAction_noTarget_move', () => {
    expect(dropAction(on(), modifier, null, { x: 5, y: 5 })).toEqual({ kind: 'move' });
  });
});

describe('hintFor', () => {
  const role = fixtureCard('role', { x: 0, y: 0 });
  const board = fixtureBoard([role]);

  it('hintFor_goalInSlotBandUnderRole_slot', () => {
    expect(hintFor(board, fixtureCard('goal'), role, { x: 100, y: 230 })).toBe('slot');
  });

  it('hintFor_roleOverGoal_slot', () => {
    // Out of the normal order, a tuck still shows where the card lands (user 2026-11-03).
    const goal = fixtureCard('goal');
    expect(hintFor(fixtureBoard([goal]), role, goal, { x: 100, y: 100 })).toBe('slot');
  });

  it('hintFor_goalOverEmptyCanvas_null', () => {
    expect(hintFor(board, fixtureCard('goal'), null, { x: 900, y: 900 })).toBeNull();
  });

  it('hintFor_hookOverCard_null', () => {
    expect(hintFor(board, fixtureCard('hook'), role, { x: 100, y: 100 })).toBeNull();
  });

  it('hintFor_modifierOverRole_combine', () => {
    expect(hintFor(board, modifier, role, { x: 100, y: 100 })).toBe('combine');
  });

  it('hintFor_modifierOverCombined_swapZones', () => {
    const combined = combinedCard('setting');
    expect(hintFor(fixtureBoard([combined]), modifier, combined, { x: 10, y: 10 })).toBe(
      'swapZones',
    );
  });
});

describe('isNormalPlace', () => {
  it('isNormalPlace_roleUnderEmptyHook_true', () => {
    const hook = fixtureCard('hook');
    expect(isNormalPlace(fixtureBoard([hook]), fixtureCard('role'), hook)).toBe(true);
    expect(isNormalPlace(fixtureBoard([hook]), fixtureCard('mechanic'), hook)).toBe(false);
  });

  it('isNormalPlace_goalAfterMechanic_true', () => {
    const mechanic = fixtureCard('mechanic');
    expect(isNormalPlace(fixtureBoard([mechanic]), fixtureCard('goal'), mechanic)).toBe(true);
  });

  it('isNormalPlace_mechanicAfterGoal_false', () => {
    const goal = fixtureCard('goal');
    expect(isNormalPlace(fixtureBoard([goal]), fixtureCard('mechanic'), goal)).toBe(false);
  });

  it('isNormalPlace_targetWithChildren_false', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    const role = board.cards[0]!;
    expect(isNormalPlace(board, fixtureCard('mechanic'), role)).toBe(false);
  });

  it('isNormalPlace_optionalDeck_false', () => {
    const role = fixtureCard('role');
    expect(isNormalPlace(fixtureBoard([role]), fixtureCard('mood'), role)).toBe(false);
  });
});

describe('hook drops', () => {
  it('dropAction_hookOverCard_refusesTuck', () => {
    const role = fixtureCard('role');
    expect(dropAction(fixtureBoard([role]), fixtureCard('hook'), role, { x: 5, y: 5 })).toEqual({
      kind: 'move',
      refused: 'hookCannotTuck',
    });
  });

  it('dropTarget_hookIs240Wide', () => {
    const board = fixtureBoard([fixtureCard('hook'), fixtureCard('role', { x: 900, z: 2 })]);
    expect(dropTarget(board, 'role-1', { x: 230, y: 100 })?.id).toBe('hook-1');
  });
});

describe('tuckLanding', () => {
  // A chain: role → mechanic → goal, from (0, 0).
  const chain = () =>
    fixtureBoard([
      fixtureCard('role', { x: 0, y: 0 }),
      fixtureCard('mechanic', { x: 0, y: 56, z: 2, tuckedUnder: 'role-1' }),
      fixtureCard('goal', { x: 0, y: 112, z: 3, tuckedUnder: 'mechanic-1' }),
      fixtureCard('conflict', { x: 600, y: 0, z: 4 }),
      fixtureCard('modifier', { x: 900, y: 0, z: 5 }),
    ]);

  it('tuckLanding_bottomCard_landsBelowIt', () => {
    expect(tuckLanding(chain(), 'conflict-1', 'goal-1')).toEqual({ x: 0, y: 168 });
  });

  it('tuckLanding_middleCard_landsAfterItsTuckedCards', () => {
    expect(tuckLanding(chain(), 'conflict-1', 'role-1')).toEqual({ x: 0, y: 168 });
  });

  it('tuckLanding_modifierOnMiddleCard_landsRightAfterIt', () => {
    // A Modifier over a Mechanic tucks (it combines only onto Role, Resource, Setting).
    expect(tuckLanding(chain(), 'modifier-1', 'mechanic-1')).toEqual({ x: 0, y: 112 });
  });

  it('tuckLanding_hookCard_landsInsetAfterItsStack', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      fixtureCard('role', { x: 20, y: 56, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { x: 600, y: 0, z: 3 }),
    ]);
    expect(tuckLanding(board, 'goal-1', 'hook-1')).toEqual({ x: 20, y: 112 });
  });
});

describe('dropTarget on a One-Pager board', () => {
  it('dropTarget_overConceptCardPlace_null', () => {
    // Every Concept card keeps x, y = 0, 0; nothing on the canvas is there.
    const board = onePagerBoard();
    expect(dropTarget(board, 'modifier-1', { x: 50, y: 50 })).toBeNull();
  });
});

describe('Core Loop card drops', () => {
  const withGoal = () => {
    const board = onePagerWithLoop();
    return {
      ...board,
      cards: [...board.cards, fixtureCard('goal', { id: 'goal-x', x: 2000, y: 2000, z: 10 })],
    };
  };
  const loopOf = (board: ReturnType<typeof onePagerWithLoop>) =>
    board.cards.find((card) => card.id === 'loop-1')!;

  it('paintOrder_loopCard_neverATarget', () => {
    const board = withGoal();
    expect(paintOrder(board).map((card) => card.id)).not.toContain('loop-1');
    expect(dropTarget(board, 'goal-x', { x: 700, y: 150 })).toBeNull();
  });

  it('dropAction_draggedLoopOverCard_movesOnly', () => {
    const board = onePagerWithLoop();
    const hook = board.cards.find((card) => card.id === 'hook-1')!;
    expect(dropAction(board, loopOf(board), hook, { x: 150, y: 120 })).toEqual({ kind: 'move' });
  });

  it('hintFor_draggedLoop_null', () => {
    const board = onePagerWithLoop();
    const hook = board.cards.find((card) => card.id === 'hook-1')!;
    expect(hintFor(board, loopOf(board), hook, { x: 150, y: 120 })).toBeNull();
  });
});
