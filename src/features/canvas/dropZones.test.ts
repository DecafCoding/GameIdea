/**
 * Tests for the drop target, the drop action and the drag hints.
 */
import { describe, expect, it } from 'vitest';
import { combinedCard, fixtureBoard, fixtureCard, fixtureStack } from '@/test/fixtures/boards';
import { dropAction, dropTarget, hintFor } from './dropZones';

const description = fixtureCard('description', { x: 900, y: 900, z: 9 });

describe('dropTarget', () => {
  it('dropTarget_overlappingCards_returnsTopmost', () => {
    const board = fixtureBoard([
      fixtureCard('character', { x: 0, y: 0, z: 1 }),
      fixtureCard('setting', { x: 100, y: 100, z: 2 }),
      description,
    ]);
    expect(dropTarget(board, description.id, { x: 150, y: 150 })?.id).toBe('setting-1');
    expect(dropTarget(board, description.id, { x: 50, y: 50 })?.id).toBe('character-1');
    expect(dropTarget(board, description.id, { x: 600, y: 600 })).toBeNull();
  });

  it('dropTarget_tuckedCardOverlap_returnsParent', () => {
    const board = fixtureBoard([...fixtureStack(0, 0), description]);
    expect(dropTarget(board, description.id, { x: 100, y: 150 })?.id).toBe('character-1');
    expect(dropTarget(board, description.id, { x: 100, y: 350 })?.id).toBe('conflict-1');
  });

  it('dropTarget_ownDescendant_skipped', () => {
    const board = fixtureBoard(fixtureStack(0, 0));
    expect(dropTarget(board, 'character-1', { x: 100, y: 340 })).toBeNull();
  });

  it('dropTarget_motivationInSlotBand_hitsCharacter', () => {
    const board = fixtureBoard([
      fixtureCard('character', { x: 0, y: 0 }),
      fixtureCard('motivation', { x: 900, y: 0, z: 2 }),
    ]);
    expect(dropTarget(board, 'motivation-1', { x: 100, y: 300 })?.id).toBe('character-1');
    expect(dropTarget(board, 'motivation-1', { x: 100, y: 330 })).toBeNull();
  });
});

describe('dropAction', () => {
  const character = fixtureCard('character', { x: 0, y: 0 });
  const combined = combinedCard('character', { x: 0, y: 0 });

  it('dropAction_descriptionOnUncombinedCharacter_combine', () => {
    expect(dropAction(description, character, { x: 10, y: 10 })).toEqual({ kind: 'combine' });
  });

  it('dropAction_descriptionOnCombinedCenter_swap', () => {
    expect(dropAction(description, combined, { x: 140, y: 120 })).toEqual({ kind: 'swap' });
  });

  it('dropAction_descriptionOnCombinedEdge_onTop', () => {
    expect(dropAction(description, combined, { x: 100, y: 190 })).toEqual({ kind: 'onTop' });
    expect(dropAction(description, combined, { x: 100, y: 20 })).toEqual({ kind: 'onTop' });
  });

  it('dropAction_motivationOnSetting_tuck', () => {
    const setting = fixtureCard('setting');
    expect(dropAction(fixtureCard('motivation'), setting, { x: 5, y: 5 })).toEqual({
      kind: 'tuck',
    });
  });

  it('dropAction_noTarget_move', () => {
    expect(dropAction(description, null, { x: 5, y: 5 })).toEqual({ kind: 'move' });
  });
});

describe('hintFor', () => {
  const character = fixtureCard('character', { x: 0, y: 0 });

  it('hintFor_motivationInSlotBandUnderCharacter_slot', () => {
    expect(hintFor(fixtureCard('motivation'), character, { x: 100, y: 270 })).toBe('slot');
  });

  it('hintFor_conflictOverCharacter_null', () => {
    expect(hintFor(fixtureCard('conflict'), character, { x: 100, y: 100 })).toBeNull();
  });

  it('hintFor_descriptionOverCharacter_combine', () => {
    expect(hintFor(description, character, { x: 100, y: 100 })).toBe('combine');
  });

  it('hintFor_descriptionOverCombined_swapZones', () => {
    const combined = combinedCard('setting');
    expect(hintFor(description, combined, { x: 10, y: 10 })).toBe('swapZones');
  });
});
