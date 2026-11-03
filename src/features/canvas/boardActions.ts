/**
 * Board actions: each user action as one pure Board → Board recipe, the unit that the
 * store's changeBoard commits (one undo step and one save in Phase 4). Never mutates its
 * input; every change returns a new board with a new cards array.
 */
import { combine, split, swap, turnCard, type RingSlot, type TurnDirection } from '@/features/card';
import { newId, type Board, type Card } from '@/shared/model';
import { dropAction, dropTarget } from './dropZones';
import { besideSpot, type Point } from './placement';
import {
  childrenOf,
  descendantsOf,
  isRoot,
  layoutStack,
  moveCard,
  nextZ,
  putOnTop,
  removeFromStacks,
  rootOf,
  tuckCard,
  untuckCard,
} from './stack';

function cardAt(board: Board, id: string): Card {
  const card = board.cards.find((c) => c.id === id);
  if (!card) throw new Error(`The board has no card ${id}.`);
  return card;
}

function replaceCard(board: Board, card: Card): Board {
  return { ...board, cards: board.cards.map((c) => (c.id === card.id ? card : c)) };
}

/** Adds a drawn card as a root at the spot, on top of every other card. */
export function placeNewCard(board: Board, card: Card, spot: Point): Board {
  return {
    ...board,
    cards: [...board.cards, { ...card, x: spot.x, y: spot.y, z: nextZ(board), tuckedUnder: null }],
  };
}

/**
 * Ends a drag. point is the pointer in flow coordinates (it picks the target and zone);
 * dropAt is the card's new top-left, used when the drop lands on empty canvas.
 */
export function dropCard(board: Board, draggedId: string, point: Point, dropAt: Point): Board {
  const dragged = cardAt(board, draggedId);
  const target = dropTarget(board, draggedId, point);
  const action = dropAction(dragged, target, point);
  switch (action.kind) {
    case 'move':
      return isRoot(board, draggedId)
        ? moveCard(board, draggedId, dropAt.x, dropAt.y)
        : untuckCard(board, draggedId, dropAt.x, dropAt.y);
    case 'tuck':
      return tuckCard(board, draggedId, target!.id);
    case 'combine':
      return combineOnto(board, draggedId, target!.id);
    case 'swap':
      return swapOnto(board, draggedId, target!.id);
    case 'onTop':
      return putOnTop(board, draggedId, target!.id);
  }
}

/**
 * First combine: the Description's ring becomes the target's adjectives and the
 * Description card is deleted. Cards tucked under the Description re-tuck under the target.
 */
export function combineOnto(board: Board, descriptionId: string, targetId: string): Board {
  const description = cardAt(board, descriptionId);
  const combined = combine(cardAt(board, targetId), description);
  const children = childrenOf(board, descriptionId).filter((c) => c.id !== targetId);
  let next = removeFromStacks(board, descriptionId);
  next = replaceCard(next, { ...cardAt(next, targetId), rings: combined.rings });
  next = { ...next, cards: next.cards.filter((c) => c.id !== descriptionId) };
  for (const child of children) next = tuckCard(next, child.id, targetId);
  return layoutStack(next, rootOf(next, targetId).id);
}

/**
 * Swap: the combined target and the Description exchange rings. The Description leaves
 * its stack, keeping its own tucked cards, and lands beside the target on top.
 */
export function swapOnto(board: Board, descriptionId: string, targetId: string): Board {
  const result = swap(cardAt(board, targetId), cardAt(board, descriptionId));
  const skip = new Set([descriptionId, ...descendantsOf(board, descriptionId).map((c) => c.id)]);
  const spot = besideSpot(board, cardAt(board, targetId), skip);
  let next = untuckCard(board, descriptionId, spot.x, spot.y);
  next = replaceCard(next, { ...cardAt(next, targetId), rings: result.target.rings });
  return replaceCard(next, { ...cardAt(next, descriptionId), rings: result.description.rings });
}

/**
 * Split: the combined card keeps its nouns, and its adjectives (with their active cue)
 * become a new Description beside it. Cards tucked under it stay where they are.
 */
export function splitCard(board: Board, cardId: string, createId: () => string = newId): Board {
  const card = cardAt(board, cardId);
  const result = split(card);
  const spot = besideSpot(board, card);
  const description: Card = {
    id: createId(),
    type: 'description',
    x: spot.x,
    y: spot.y,
    z: nextZ(board),
    tuckedUnder: null,
    rings: [result.ring],
  };
  const next = replaceCard(board, { ...card, rings: result.target.rings });
  return { ...next, cards: [...next.cards, description] };
}

/**
 * Redraw: the card keeps its id, place, z and tucks, and takes the drawn card's one ring. A
 * combined card keeps its adjective ring, so only the nouns change. The caller draws, because
 * drawing needs pools.
 */
export function redrawCard(board: Board, cardId: string, drawn: Card): Board {
  const card = cardAt(board, cardId);
  if (drawn.type !== card.type) {
    throw new Error(`A ${card.type} card cannot be redrawn as a ${drawn.type}.`);
  }
  return replaceCard(board, {
    ...card,
    rings: [...drawn.rings, ...card.rings.slice(1)].map((r) => ({ ...r, cues: [...r.cues] })),
  });
}

/** Discard: deletes the card; its tucked cards move up to its parent or become roots. */
export function discardCard(board: Board, cardId: string): Board {
  const next = removeFromStacks(board, cardId);
  return { ...next, cards: next.cards.filter((c) => c.id !== cardId) };
}

/** Saves the connector word chosen on the badge above the card. */
export function chooseConnector(board: Board, cardId: string, word: string): Board {
  const card = cardAt(board, cardId);
  return card.connector === word ? board : replaceCard(board, { ...card, connector: word });
}

/** Turns one ring of a card one step. */
export function turnCardOnBoard(
  board: Board,
  cardId: string,
  slot: RingSlot,
  direction: TurnDirection,
): Board {
  return replaceCard(board, turnCard(cardAt(board, cardId), slot, direction));
}
