/**
 * Tests for the open-spot search.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import { besideSpot, boardRects, cardSize, findOpenSpot, snapToGrid } from './placement';

const SIZE = { width: 200, height: 200 };

describe('findOpenSpot', () => {
  it('findOpenSpot_freeStart_returnsSnappedStart', () => {
    expect(findOpenSpot({ x: 50, y: 37 }, [], SIZE)).toEqual({ x: 48, y: 48 });
  });

  it('findOpenSpot_occupiedStart_returnsNearestFreeSpot', () => {
    const occupied = [{ x: 0, y: 0, width: 200, height: 200 }];
    const spot = findOpenSpot({ x: 0, y: 0 }, occupied, SIZE);
    // 200 px plus the 24 px margin is 224; the first grid point past it is 240.
    expect(Math.hypot(spot.x, spot.y)).toBe(240);
  });
});

describe('besideSpot', () => {
  it('besideSpot_freeRight_returnsNextGridPointRight', () => {
    const card = fixtureCard('role', { x: 0, y: 0 });
    expect(besideSpot(fixtureBoard([card]), card)).toEqual({ x: 240, y: 0 });
  });

  it('boardRects_notes_useTheirSize', () => {
    const board = fixtureBoard(
      [],
      [{ id: 'n', title: 'Note', text: '', x: 5, y: 6, width: 310, height: 160 }],
    );
    expect(boardRects(board)).toEqual([{ x: 5, y: 6, width: 310, height: 160 }]);
  });
});

describe('cardSize', () => {
  it('cardSize_hook_is240Wide', () => {
    expect(cardSize(fixtureCard('hook'))).toEqual({ width: 240, height: 200 });
    expect(cardSize(fixtureCard('mechanic'))).toEqual({ width: 200, height: 200 });
  });
});

describe('snapToGrid', () => {
  it('snapToGrid_nearestPoint', () => {
    expect(snapToGrid({ x: 37, y: 61 })).toEqual({ x: 48, y: 72 });
    expect(snapToGrid({ x: 35, y: 59 })).toEqual({ x: 24, y: 48 });
    expect(snapToGrid({ x: 96, y: 0 })).toEqual({ x: 96, y: 0 });
  });

  it('snapToGrid_negativeCoordinates', () => {
    expect(snapToGrid({ x: -37, y: -11 })).toEqual({ x: -48, y: 0 });
    expect(Object.is(snapToGrid({ x: -5, y: -1 }).x, 0)).toBe(true);
    expect(Object.is(snapToGrid({ x: -5, y: -1 }).y, 0)).toBe(true);
  });

  it('snapToGrid_halfwayRoundsUp', () => {
    expect(snapToGrid({ x: 12, y: 36 })).toEqual({ x: 24, y: 48 });
    expect(snapToGrid({ x: -12, y: -36 })).toEqual({ x: 0, y: -24 });
  });
});
