/**
 * Tuck stacks as pure functions. A stack is a tree: each card's tuckedUnder names its
 * parent. Every card keeps an absolute x, y; a tucked card's position is always derived
 * from its stack, 56 px below the card before it in stack order. A card whose parent is
 * missing counts as a root. No React Flow here: the rules must hold if the canvas changes.
 */
import type { Board, Card } from '@/shared/model';
import { HOOK_INSET } from './placement';

/** Design --tuck-offset. */
export const TUCK_OFFSET = 56;

function byId(board: Board): Map<string, Card> {
  return new Map(board.cards.map((card) => [card.id, card]));
}

function cardAt(board: Board, id: string): Card {
  const card = board.cards.find((c) => c.id === id);
  if (!card) throw new Error(`The board has no card ${id}.`);
  return card;
}

/** The card's parent, or null for a root (including a dangling tuckedUnder). */
function parentOf(cards: Map<string, Card>, card: Card): Card | null {
  return card.tuckedUnder === null ? null : (cards.get(card.tuckedUnder) ?? null);
}

/** The top card of the stack the card is in. */
export function rootOf(board: Board, id: string): Card {
  const cards = byId(board);
  let card = cardAt(board, id);
  const seen = new Set<string>();
  for (let parent = parentOf(cards, card); parent; parent = parentOf(cards, card)) {
    if (seen.has(card.id)) throw new Error('The tuck stack has a cycle.');
    seen.add(card.id);
    card = parent;
  }
  return card;
}

export function isRoot(board: Board, id: string): boolean {
  return rootOf(board, id).id === id;
}

/** Direct children in child order: Modifiers first, then by z (tuck time) ascending. */
export function childrenOf(board: Board, id: string): Card[] {
  const cards = byId(board);
  return board.cards
    .filter((card) => card.tuckedUnder === id && parentOf(cards, card)?.id === id)
    .sort((a, b) => {
      const da = a.type === 'modifier' ? 0 : 1;
      const db = b.type === 'modifier' ? 0 : 1;
      return da - db || a.z - b.z;
    });
}

/** Every card in the card's own stack (its tucked cards, deep), in stack order. */
export function descendantsOf(board: Board, id: string): Card[] {
  return stackOrder(board, id).slice(1);
}

/** Depth-first from this card: each card, then its children in child order. */
export function stackOrder(board: Board, rootId: string): Card[] {
  const out: Card[] = [];
  const visit = (card: Card) => {
    out.push(card);
    for (const child of childrenOf(board, card.id)) visit(child);
  };
  visit(cardAt(board, rootId));
  return out;
}

/**
 * Places each card of the stack 56 px below the one before it, under the root's x, y.
 * Under a Hook Card, every stack card sits 20 px in from its left edge.
 */
export function layoutStack(board: Board, rootId: string): Board {
  const order = stackOrder(board, rootId);
  const root = order[0]!;
  const x = root.type === 'hook' ? root.x + HOOK_INSET : root.x;
  const place = new Map(order.map((card, i) => [card.id, root.y + i * TUCK_OFFSET]));
  let changed = false;
  const cards = board.cards.map((card) => {
    const y = place.get(card.id);
    if (y === undefined) return card;
    const cx = card.id === root.id ? root.x : x;
    if (card.x === cx && card.y === y) return card;
    changed = true;
    return { ...card, x: cx, y };
  });
  return changed ? { ...board, cards } : board;
}

/** Max z over cards plus 1 (1 on an empty board). */
export function nextZ(board: Board): number {
  return board.cards.reduce((max, card) => Math.max(max, card.z), 0) + 1;
}

function replaceCard(board: Board, id: string, change: (card: Card) => Card): Board {
  return { ...board, cards: board.cards.map((card) => (card.id === id ? change(card) : card)) };
}

/** Moves a root to x, y and lays out its stack. */
export function moveCard(board: Board, id: string, x: number, y: number): Board {
  if (!isRoot(board, id)) throw new Error('Only the top card of a stack can be moved.');
  return layoutStack(
    replaceCard(board, id, (card) => ({ ...card, x, y })),
    id,
  );
}

/** Tucks the card (with its own stack) under the target and lays out both stacks. */
export function tuckCard(board: Board, id: string, targetId: string): Board {
  if (id === targetId || descendantsOf(board, id).some((card) => card.id === targetId)) {
    throw new Error('A card cannot be tucked under itself or a card tucked under it.');
  }
  cardAt(board, targetId);
  const oldRoot = rootOf(board, id).id;
  const z = nextZ(board);
  let next = replaceCard(board, id, (card) => ({ ...card, tuckedUnder: targetId, z }));
  if (oldRoot !== id) next = layoutStack(next, oldRoot);
  return layoutStack(next, rootOf(next, targetId).id);
}

/** Takes a tucked card (with its own stack) out of its stack, as a new root at x, y. */
export function untuckCard(board: Board, id: string, x: number, y: number): Board {
  const oldRoot = rootOf(board, id).id;
  const z = nextZ(board);
  let next = replaceCard(board, id, (card) => ({ ...card, tuckedUnder: null, z, x, y }));
  if (oldRoot !== id) next = layoutStack(next, oldRoot);
  return layoutStack(next, id);
}

/**
 * Before a card is deleted: its direct children move to its parent, or become roots where
 * they sit when it was a root. The card itself leaves the stack, which closes the gap.
 */
export function removeFromStacks(board: Board, id: string): Board {
  const card = cardAt(board, id);
  const cards = byId(board);
  const parent = parentOf(cards, card);
  const children = new Set(childrenOf(board, id).map((c) => c.id));
  const oldRoot = rootOf(board, id).id;
  let next: Board = {
    ...board,
    cards: board.cards.map((c) => {
      if (c.id === id) return { ...c, tuckedUnder: null };
      if (children.has(c.id)) return { ...c, tuckedUnder: parent ? parent.id : null };
      return c;
    }),
  };
  if (parent) return layoutStack(next, oldRoot);
  for (const childId of children) next = layoutStack(next, childId);
  return next;
}

/** The card's index in its stack order: 0 for a root, for the paper step. */
export function stackDepth(board: Board, id: string): number {
  return stackOrder(board, rootOf(board, id).id).findIndex((card) => card.id === id);
}
