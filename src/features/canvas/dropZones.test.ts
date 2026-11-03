/**
 * Tests for the drop target, the drop action and the drag hints.
 */
import { describe, expect, it } from 'vitest';
import { combinedCard, fixtureBoard, fixtureCard, fixtureStack } from '@/test/fixtures/boards';
import { dropAction, dropTarget, hintFor } from './dropZones';

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
    expect(dropTarget(board, modifier.id, { x: 100, y: 350 })?.id).toBe('conflict-1');
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
    expect(dropTarget(board, 'goal-1', { x: 100, y: 300 })?.id).toBe('role-1');
    expect(dropTarget(board, 'goal-1', { x: 100, y: 330 })).toBeNull();
  });
});

describe('dropAction', () => {
  const role = fixtureCard('role', { x: 0, y: 0 });
  const combined = combinedCard('role', { x: 0, y: 0 });

  it('dropAction_modifierOnUncombinedRole_combine', () => {
    expect(dropAction(modifier, role, { x: 10, y: 10 })).toEqual({ kind: 'combine' });
  });

  it('dropAction_modifierOnCombinedCenter_swap', () => {
    expect(dropAction(modifier, combined, { x: 140, y: 120 })).toEqual({ kind: 'swap' });
  });

  it('dropAction_modifierOnCombinedEdge_onTop', () => {
    expect(dropAction(modifier, combined, { x: 100, y: 190 })).toEqual({ kind: 'onTop' });
    expect(dropAction(modifier, combined, { x: 100, y: 20 })).toEqual({ kind: 'onTop' });
  });

  it('dropAction_goalOnSetting_tuck', () => {
    const setting = fixtureCard('setting');
    expect(dropAction(fixtureCard('goal'), setting, { x: 5, y: 5 })).toEqual({
      kind: 'tuck',
    });
  });

  it('dropAction_noTarget_move', () => {
    expect(dropAction(modifier, null, { x: 5, y: 5 })).toEqual({ kind: 'move' });
  });
});

describe('hintFor', () => {
  const role = fixtureCard('role', { x: 0, y: 0 });

  it('hintFor_goalInSlotBandUnderRole_slot', () => {
    expect(hintFor(fixtureCard('goal'), role, { x: 100, y: 270 })).toBe('slot');
  });

  it('hintFor_conflictOverRole_null', () => {
    expect(hintFor(fixtureCard('conflict'), role, { x: 100, y: 100 })).toBeNull();
  });

  it('hintFor_modifierOverRole_combine', () => {
    expect(hintFor(modifier, role, { x: 100, y: 100 })).toBe('combine');
  });

  it('hintFor_modifierOverCombined_swapZones', () => {
    const combined = combinedCard('setting');
    expect(hintFor(modifier, combined, { x: 10, y: 10 })).toBe('swapZones');
  });
});
