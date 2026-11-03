/**
 * Drop zones (design 9.7 and 9.8): which card a drag points at, what the drop does, and
 * which hint shows. Everything uses the pointer position in flow coordinates, never the
 * dragged card's rectangle.
 * A Modifier over a Player Role, Resource or Setting with no merged ring combines anywhere.
 * Over a merged card with no On Top Modifier, the 52 px top band adds it on top and the
 * rest of the card swaps; with an On Top Modifier, the whole card swaps. A Modifier over
 * any other deck tucks like a normal card.
 */
import { isCombined } from '@/features/card';
import { BASE_TYPES, type Board, type Card } from '@/shared/model';
import { CARD_SIZE, type Point } from './placement';
import { isOnTop, onTopCardOf } from './reading';
import { descendantsOf, isRoot, stackOrder } from './stack';

/** Height of the "Add on top" band across a merged card's top (design 9.8). */
export const TOP_BAND = 52;
/** The drawn swap circle (design 9.8): 96 wide, top-left at (52, 70) on the card. */
export const SWAP_CIRCLE = { left: 52, top: 70, size: 96 } as const;
/** Height of the slot band under a normal-place target's bottom edge. */
export const SLOT_BAND = 72;

export type DropAction =
  { kind: 'move' } | { kind: 'tuck' } | { kind: 'combine' } | { kind: 'swap' } | { kind: 'onTop' };
export type DropHint = 'combine' | 'swapZones' | 'swapOnly' | 'slot' | null;

/** The normal place: a Goal under a Player Role, a Conflict under a Goal. */
export function isNormalPlace(dragged: Card, target: Card): boolean {
  return (
    (dragged.type === 'goal' && target.type === 'role') ||
    (dragged.type === 'conflict' && target.type === 'goal')
  );
}

function inCard(card: Card, point: Point): boolean {
  return (
    point.x >= card.x &&
    point.x <= card.x + CARD_SIZE &&
    point.y >= card.y &&
    point.y <= card.y + CARD_SIZE
  );
}

function inSlotBand(card: Card, point: Point): boolean {
  return (
    point.x >= card.x &&
    point.x <= card.x + CARD_SIZE &&
    point.y > card.y + CARD_SIZE &&
    point.y <= card.y + CARD_SIZE + SLOT_BAND
  );
}

/** Every card, topmost first: roots by z descending, each followed by its stack order. */
export function paintOrder(board: Board): Card[] {
  return board.cards
    .filter((card) => isRoot(board, card.id) && !isOnTop(board, card))
    .sort((a, b) => b.z - a.z)
    .flatMap((root) => stackOrder(board, root.id));
}

/**
 * The topmost card under the point, skipping the dragged card and its own stack. A point
 * in the slot band under a normal-place target also hits that target.
 */
export function dropTarget(board: Board, draggedId: string, point: Point): Card | null {
  const dragged = board.cards.find((card) => card.id === draggedId);
  if (!dragged) return null;
  const skip = new Set([draggedId, ...descendantsOf(board, draggedId).map((card) => card.id)]);
  for (const card of paintOrder(board)) {
    if (skip.has(card.id)) continue;
    if (inCard(card, point)) return card;
    if (isNormalPlace(dragged, card) && inSlotBand(card, point)) return card;
  }
  return null;
}

function canCombine(dragged: Card, target: Card): boolean {
  return dragged.type === 'modifier' && BASE_TYPES.includes(target.type) && !isCombined(target);
}

function canSwap(dragged: Card, target: Card): boolean {
  return dragged.type === 'modifier' && isCombined(target);
}

function inTopBand(target: Card, point: Point): boolean {
  return point.y < target.y + TOP_BAND;
}

/**
 * What a drop does. A Modifier on a merged card goes on top in the top band and swaps
 * elsewhere; once the card has an On Top Modifier, it swaps anywhere.
 */
export function dropAction(
  board: Board,
  dragged: Card,
  target: Card | null,
  point: Point,
): DropAction {
  if (!target) return { kind: 'move' };
  if (canCombine(dragged, target)) return { kind: 'combine' };
  if (canSwap(dragged, target)) {
    if (onTopCardOf(board, target.id)) return { kind: 'swap' };
    return inTopBand(target, point) ? { kind: 'onTop' } : { kind: 'swap' };
  }
  return { kind: 'tuck' };
}

/** The hint to draw while dragging over the target. */
export function hintFor(board: Board, dragged: Card, target: Card | null, point: Point): DropHint {
  if (!target) return null;
  if (canCombine(dragged, target)) return 'combine';
  if (canSwap(dragged, target)) return onTopCardOf(board, target.id) ? 'swapOnly' : 'swapZones';
  if (isNormalPlace(dragged, target) && (inCard(target, point) || inSlotBand(target, point))) {
    return 'slot';
  }
  return null;
}
