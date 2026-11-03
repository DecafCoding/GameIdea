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
} from '@/test/fixtures/boards';
import { dropAction, dropTarget, hintFor, isNormalPlace } from './dropZones';

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
    expect(hintFor(on(mechanic), modifier, mechanic, { x: 100, y: 100 })).toBeNull();
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

  it('hintFor_roleOverGoal_null', () => {
    const goal = fixtureCard('goal');
    expect(hintFor(fixtureBoard([goal]), role, goal, { x: 100, y: 100 })).toBeNull();
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
