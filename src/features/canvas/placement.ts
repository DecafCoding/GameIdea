/**
 * Placement: where a new card or note lands. A spot is the nearest free point on the
 * 24 px grid to a start point, keeping a 24 px margin to every card and note.
 * Points are flow coordinates.
 */
import type { Board, Card } from '@/shared/model';
import { isOnTop } from './reading';

/** Design --card-size (design 9.4). */
export const CARD_SIZE = 200;
/** Design --grid-pitch. */
export const GRID = 24;
const MAX_RINGS = 400;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

const snap = (value: number) => Math.round(value / GRID) * GRID;

function overlapsAny(spot: Point, size: Size, occupied: Rect[]): boolean {
  return occupied.some(
    (r) =>
      spot.x < r.x + r.width + GRID &&
      spot.x + size.width + GRID > r.x &&
      spot.y < r.y + r.height + GRID &&
      spot.y + size.height + GRID > r.y,
  );
}

/**
 * The start point snapped to the grid when that spot is free, else the nearest free grid
 * point found ring by ring on a square spiral (up to 400 rings), else the snapped start.
 */
export function findOpenSpot(start: Point, occupied: Rect[], size: Size): Point {
  const origin = { x: snap(start.x), y: snap(start.y) };
  if (!overlapsAny(origin, size, occupied)) return origin;
  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (let i = -ring; i <= ring; i++) {
      for (const [dx, dy] of [
        [i, -ring],
        [i, ring],
        [-ring, i],
        [ring, i],
      ] as const) {
        const spot = { x: origin.x + dx * GRID, y: origin.y + dy * GRID };
        const distance = Math.hypot(spot.x - start.x, spot.y - start.y);
        if (distance < bestDistance && !overlapsAny(spot, size, occupied)) {
          best = spot;
          bestDistance = distance;
        }
      }
    }
    if (best) return best;
  }
  return origin;
}

/**
 * A rect for every card (200 × 200) and note (its size), skipping the ids given. A card on
 * top of another has no place of its own: its base card covers it.
 */
export function boardRects(board: Board, skip: ReadonlySet<string> = new Set()): Rect[] {
  return [
    ...board.cards
      .filter((card) => !skip.has(card.id) && !isOnTop(board, card))
      .map((card) => ({ x: card.x, y: card.y, width: CARD_SIZE, height: CARD_SIZE })),
    ...board.notes
      .filter((note) => !skip.has(note.id))
      .map(({ x, y, width, height }) => ({ x, y, width, height })),
  ];
}

/** The free spot nearest to one card width plus a grid step right of the card. */
export function besideSpot(board: Board, card: Card, skip?: ReadonlySet<string>): Point {
  return findOpenSpot({ x: card.x + CARD_SIZE + GRID, y: card.y }, boardRects(board, skip), {
    width: CARD_SIZE,
    height: CARD_SIZE,
  });
}
