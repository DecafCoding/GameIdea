/**
 * Drop zones (design 9.7 and 9.8): which card a drag points at, what the drop does, and
 * which hint shows. Everything uses the pointer position in flow coordinates, never the
 * dragged card's rectangle.
 * A Modifier over a Player Role, Resource or Setting with no merged ring combines anywhere.
 * Over a merged card with no On Top Modifier, the 52 px top band adds it on top and the
 * rest of the card swaps; with an On Top Modifier, the whole card swaps. A Modifier over
 * any other deck tucks like a normal card.
 * The Core Loop card is never a drop target and never tucks: a dragged Core Loop card only
 * moves, with no hint and no refusal notice.
 */
import { isCombined } from '@/features/card';
import { BASE_TYPES, type Board, type Card, type CardType } from '@/shared/model';
import { cardSize, type Point } from './placement';
import { isOnTop, onTopCardOf } from './reading';
import { childrenOf, descendantsOf, isRoot, stackOrder, tuckCard } from './stack';

/** Height of the "Add on top" band across a merged card's top (design 9.8). */
export const TOP_BAND = 52;
/** The drawn swap circle (design 9.8): 96 wide, top-left at (52, 70) on the card. */
export const SWAP_CIRCLE = { left: 52, top: 70, size: 96 } as const;
/** Height of the slot band under a normal-place target's bottom edge. */
export const SLOT_BAND = 72;

/**
 * What a drop does. A move may carry a refusal: the drop pointed at a card, but the dragged
 * card cannot tuck there (a Hook Card never tucks), so it only moves and a notice shows.
 */
export type DropAction =
  | { kind: 'move'; refused?: 'hookCannotTuck' }
  | { kind: 'tuck' }
  | { kind: 'combine' }
  | { kind: 'swap' }
  | { kind: 'onTop' };
export type DropHint = 'combine' | 'swapZones' | 'swapOnly' | 'slot' | null;

/** The normal order of a stack under a Hook Card (design 9.7). */
export const CORE_ORDER: readonly CardType[] = ['role', 'mechanic', 'resource', 'goal', 'conflict'];

/**
 * The normal place, where a tuck hint shows: the target is the bottom card of its stack
 * (nothing tucked under it), and either it is a Hook Card and the dragged card a Player
 * Role, or both are core decks with the dragged card later in the order Player Role,
 * Mechanic, Resource, Goal, Conflict (skipping is allowed). Any card can still tuck under
 * any card.
 */
export function isNormalPlace(board: Board, dragged: Card, target: Card): boolean {
  if (childrenOf(board, target.id).length > 0) return false;
  if (target.type === 'hook') return dragged.type === 'role';
  const from = CORE_ORDER.indexOf(target.type);
  const to = CORE_ORDER.indexOf(dragged.type);
  return from >= 0 && to > from;
}

function inCard(card: Card, point: Point): boolean {
  const { width, height } = cardSize(card);
  return (
    point.x >= card.x &&
    point.x <= card.x + width &&
    point.y >= card.y &&
    point.y <= card.y + height
  );
}

function inSlotBand(card: Card, point: Point): boolean {
  const { width, height } = cardSize(card);
  return (
    point.x >= card.x &&
    point.x <= card.x + width &&
    point.y > card.y + height &&
    point.y <= card.y + height + SLOT_BAND
  );
}

/** Every card, topmost first: roots by z descending, each followed by its stack order. */
export function paintOrder(board: Board): Card[] {
  return (
    board.cards
      // Concept cards have no canvas place, so they are never a drop target on the canvas.
      // The Core Loop card never takes a tuck, so it is never a target either.
      .filter(
        (card) =>
          isRoot(board, card.id) &&
          !isOnTop(board, card) &&
          !card.inConcept &&
          card.type !== 'loop',
      )
      .sort((a, b) => b.z - a.z)
      .flatMap((root) => stackOrder(board, root.id))
  );
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
    if (isNormalPlace(board, dragged, card) && inSlotBand(card, point)) return card;
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
  if (!target || dragged.type === 'loop') return { kind: 'move' };
  if (dragged.type === 'hook') return { kind: 'move', refused: 'hookCannotTuck' };
  if (canCombine(dragged, target)) return { kind: 'combine' };
  if (canSwap(dragged, target)) {
    if (onTopCardOf(board, target.id)) return { kind: 'swap' };
    return inTopBand(target, point) ? { kind: 'onTop' } : { kind: 'swap' };
  }
  return { kind: 'tuck' };
}

/**
 * The hint to draw while dragging over the target. Every drop that tucks shows the slot
 * where the card will land (user 2026-11-03); before, only the normal place did.
 */
export function hintFor(board: Board, dragged: Card, target: Card | null, point: Point): DropHint {
  if (!target || dragged.type === 'hook' || dragged.type === 'loop') return null;
  if (canCombine(dragged, target)) return 'combine';
  if (canSwap(dragged, target)) return onTopCardOf(board, target.id) ? 'swapOnly' : 'swapZones';
  return dropAction(board, dragged, target, point).kind === 'tuck' ? 'slot' : null;
}

/**
 * Where a card tucked under the target will land: its top-left after the tuck and the
 * stack layout. A tuck adds the card as the target's last child (a Modifier as its first),
 * so on a card in the middle of a stack it lands after that card's own tucked cards.
 */
export function tuckLanding(board: Board, draggedId: string, targetId: string): Point {
  const card = tuckCard(board, draggedId, targetId).cards.find((c) => c.id === draggedId)!;
  return { x: card.x, y: card.y };
}
