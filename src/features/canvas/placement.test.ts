/**
 * Tests for the open-spot search.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { besideSpot, boardRects, findOpenSpot } from './placement';

const SIZE = { width: 250, height: 250 };

describe('findOpenSpot', () => {
  it('findOpenSpot_freeStart_returnsSnappedStart', () => {
    expect(findOpenSpot({ x: 50, y: 37 }, [], SIZE)).toEqual({ x: 48, y: 48 });
  });

  it('findOpenSpot_occupiedStart_returnsNearestFreeSpot', () => {
    const occupied = [{ x: 0, y: 0, width: 250, height: 250 }];
    const spot = findOpenSpot({ x: 0, y: 0 }, occupied, SIZE);
    // 250 px plus the 24 px margin is 274; the first grid point past it is 288.
    expect(Math.hypot(spot.x, spot.y)).toBe(288);
  });
});

describe('besideSpot', () => {
  it('besideSpot_freeRight_returnsNextGridPointRight', () => {
    const card = fixtureCard('character', { x: 0, y: 0 });
    expect(besideSpot(fixtureBoard([card]), card)).toEqual({ x: 288, y: 0 });
  });

  it('boardRects_notes_useTheirSize', () => {
    const board = fixtureBoard(
      [],
      [{ id: 'n', title: 'Note', text: '', x: 5, y: 6, width: 310, height: 160 }],
    );
    expect(boardRects(board)).toEqual([{ x: 5, y: 6, width: 310, height: 160 }]);
  });
});
