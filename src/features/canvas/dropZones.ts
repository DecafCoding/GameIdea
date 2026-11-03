/**
 * Drop zones (design 9.4 and 9.5): which card a drag points at, what the drop does, and
 * which hint shows. Everything uses the pointer position in flow coordinates, never the
 * dragged card's rectangle.
 */
import { isCombined } from '@/features/card';
import type { Board, Card } from '@/shared/model';
import { CARD_SIZE, type Point } from './placement';
import { descendantsOf, isRoot, stackOrder } from './stack';

/** Radius of the 120 px swap circle on a combined card. */
export const SWAP_RADIUS = 60;
/** Height of the slot band under a normal-place target's bottom edge. */
export const SLOT_BAND = 72;

export type DropAction =
  { kind: 'move' } | { kind: 'tuck' } | { kind: 'combine' } | { kind: 'swap' } | { kind: 'onTop' };
export type DropHint = 'combine' | 'swapZones' | 'slot' | null;

/** The normal place: a Motivation under a Character, a Conflict under a Motivation. */
export function isNormalPlace(dragged: Card, target: Card): boolean {
  return (
    (dragged.type === 'motivation' && target.type === 'character') ||
    (dragged.type === 'conflict' && target.type === 'motivation')
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
    .filter((card) => isRoot(board, card.id))
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
  return (
    dragged.type === 'description' &&
    (target.type === 'character' || target.type === 'setting') &&
    !isCombined(target)
  );
}

function canSwap(dragged: Card, target: Card): boolean {
  return dragged.type === 'description' && isCombined(target);
}

function inSwapCircle(target: Card, point: Point): boolean {
  const cx = target.x + CARD_SIZE / 2;
  const cy = target.y + CARD_SIZE / 2;
  return Math.hypot(point.x - cx, point.y - cy) <= SWAP_RADIUS;
}

/**
 * What a drop does. A Description on a combined card swaps in the center circle and goes
 * on top of the card everywhere else, so its adjectives read before the card's own.
 */
export function dropAction(dragged: Card, target: Card | null, point: Point): DropAction {
  if (!target) return { kind: 'move' };
  if (canCombine(dragged, target)) return { kind: 'combine' };
  if (canSwap(dragged, target)) {
    return inSwapCircle(target, point) ? { kind: 'swap' } : { kind: 'onTop' };
  }
  return { kind: 'tuck' };
}

/** The hint to draw while dragging over the target. */
export function hintFor(dragged: Card, target: Card | null, point: Point): DropHint {
  if (!target) return null;
  if (canCombine(dragged, target)) return 'combine';
  if (canSwap(dragged, target)) return 'swapZones';
  if (isNormalPlace(dragged, target) && (inCard(target, point) || inSlotBand(target, point))) {
    return 'slot';
  }
  return null;
}
