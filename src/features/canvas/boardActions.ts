/**
 * Board actions: each user action as one pure Board → Board recipe, the unit that the
 * store's changeBoard commits (one undo step and one save in Phase 4). Never mutates its
 * input; every change returns a new board with a new cards array.
 */
import {
  combine,
  isCombined,
  split,
  swap,
  toggleLock,
  turnCard,
  type RingSlot,
  type TurnDirection,
} from '@/features/card';
import { newId, type Board, type Card } from '@/shared/model';
import { dropAction, dropTarget } from './dropZones';
import { besideSpot, type Point } from './placement';
import { onTopCardOf } from './reading';
import {
  childrenOf,
  descendantsOf,
  isRoot,
  layoutStack,
  moveCard,
  nextZ,
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

/** Adds a new Hook Card as a root at the spot, on top of every other card. */
export function placeHookCard(board: Board, id: string, spot: Point): Board {
  const hook: Card = {
    id,
    type: 'hook',
    x: spot.x,
    y: spot.y,
    z: nextZ(board),
    tuckedUnder: null,
    rings: [],
    onTopOf: null,
    locked: false,
  };
  return { ...board, cards: [...board.cards, hook] };
}

/**
 * Ends a drag. point is the pointer in flow coordinates (it picks the target and zone);
 * dropAt is the card's new top-left, used when the drop lands on empty canvas.
 */
export function dropCard(board: Board, draggedId: string, point: Point, dropAt: Point): Board {
  const dragged = cardAt(board, draggedId);
  const target = dropTarget(board, draggedId, point);
  const action = dropAction(board, dragged, target, point);
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
      return putOnTopOf(board, draggedId, target!.id);
  }
}

/**
 * First combine: the Modifier's ring becomes the target's adjectives and the
 * Modifier card is deleted. Cards tucked under the Modifier re-tuck under the target.
 */
export function combineOnto(board: Board, modifierId: string, targetId: string): Board {
  const modifier = cardAt(board, modifierId);
  const combined = combine(cardAt(board, targetId), modifier);
  const children = childrenOf(board, modifierId).filter((c) => c.id !== targetId);
  let next = removeFromStacks(board, modifierId);
  next = replaceCard(next, { ...cardAt(next, targetId), rings: combined.rings });
  next = { ...next, cards: next.cards.filter((c) => c.id !== modifierId) };
  for (const child of children) next = tuckCard(next, child.id, targetId);
  return layoutStack(next, rootOf(next, targetId).id);
}

/**
 * On Top: the Modifier sits on top of a merged base card and its adjective reads first on
 * every edge ("tall frozen pilot"). It leaves its stack (its own tucked cards re-tuck under
 * the base, as in combine) and keeps no place of its own while it is on top.
 * Throws when the base has no merged ring or already has an On Top Modifier.
 */
export function putOnTopOf(board: Board, modifierId: string, baseId: string): Board {
  const modifier = cardAt(board, modifierId);
  const base = cardAt(board, baseId);
  if (modifier.type !== 'modifier') throw new Error('Only a Modifier goes on top of a card.');
  if (!isCombined(base)) throw new Error('A Modifier goes on top only of a merged card.');
  if (onTopCardOf(board, baseId)) throw new Error('This card already has an On Top Modifier.');
  const children = childrenOf(board, modifierId).filter((c) => c.id !== baseId);
  let next = removeFromStacks(board, modifierId);
  next = replaceCard(next, { ...cardAt(next, modifierId), tuckedUnder: null, onTopOf: baseId });
  for (const child of children) next = tuckCard(next, child.id, baseId);
  return layoutStack(next, rootOf(next, baseId).id);
}

/**
 * Swap: the combined target and the Modifier exchange rings. The Modifier leaves
 * its stack, keeping its own tucked cards, and lands beside the target on top.
 */
export function swapOnto(board: Board, modifierId: string, targetId: string): Board {
  const result = swap(cardAt(board, targetId), cardAt(board, modifierId));
  const skip = new Set([modifierId, ...descendantsOf(board, modifierId).map((c) => c.id)]);
  const spot = besideSpot(board, cardAt(board, targetId), skip);
  let next = untuckCard(board, modifierId, spot.x, spot.y);
  next = replaceCard(next, { ...cardAt(next, targetId), rings: result.target.rings });
  return replaceCard(next, {
    ...cardAt(next, modifierId),
    rings: result.modifier.rings,
    modDeck: result.modifier.modDeck,
  });
}

/**
 * Split: the combined card keeps its nouns, and its adjectives (with their active cue)
 * become a new Modifier beside it; an On Top Modifier stays on top. A card with no merged
 * ring but an On Top Modifier releases that Modifier beside it instead. Cards tucked under
 * it stay where they are.
 */
export function splitCard(board: Board, cardId: string, createId: () => string = newId): Board {
  const card = cardAt(board, cardId);
  const spot = besideSpot(board, card);
  if (!isCombined(card)) {
    const onTop = onTopCardOf(board, cardId);
    if (!onTop) throw new Error('This card has nothing to split off.');
    return replaceCard(board, { ...onTop, onTopOf: null, x: spot.x, y: spot.y, z: nextZ(board) });
  }
  const result = split(card);
  const modifier: Card = {
    id: createId(),
    type: 'modifier',
    x: spot.x,
    y: spot.y,
    z: nextZ(board),
    tuckedUnder: null,
    // A free Modifier's ring has no modDeck; the card carries it.
    rings: [{ cues: result.ring.cues, activeIndex: result.ring.activeIndex }],
    modDeck: result.ring.modDeck ?? 'role',
    onTopOf: null,
    locked: false,
  };
  const next = replaceCard(board, { ...card, rings: result.target.rings });
  return { ...next, cards: [...next.cards, modifier] };
}

/**
 * Redraw: the card keeps its id, place, z, tucks, lock, badge word and on-top card, and takes
 * the drawn card's one ring. A combined card keeps its adjective ring (with its modDeck), so
 * only the nouns change. A Modifier must be redrawn from its own Modifier deck. The caller draws, because
 * drawing needs pools.
 */
export function redrawCard(board: Board, cardId: string, drawn: Card): Board {
  const card = cardAt(board, cardId);
  if (drawn.type !== card.type) {
    throw new Error(`A ${card.type} card cannot be redrawn as a ${drawn.type}.`);
  }
  if (drawn.modDeck !== card.modDeck) {
    throw new Error(`A ${card.modDeck ?? 'plain'} Modifier cannot be redrawn from another deck.`);
  }
  return replaceCard(board, {
    ...card,
    rings: [...drawn.rings, ...card.rings.slice(1)].map((r) => ({ ...r, cues: [...r.cues] })),
  });
}

/**
 * Redraw All (design 9.9): redraws every unlocked card in the Hook Card's stack with
 * redrawCard, so each keeps its place, tucks, badge word, merged ring and On Top card.
 * Locked cards and On Top cards (not in the stack) stay as they are. One recipe, so one
 * undo step; with nothing to redraw it returns the same board (no step, no save).
 * draw draws a new card like the given one; the caller has the pools.
 */
export function redrawAll(
  board: Board,
  hookId: string,
  draw: (card: Card) => Card,
): { board: Board; redrawn: string[] } {
  let next = board;
  const redrawn: string[] = [];
  for (const card of descendantsOf(board, hookId)) {
    if (card.locked || card.type === 'hook') continue;
    next = redrawCard(next, card.id, draw(card));
    redrawn.push(card.id);
  }
  return { board: next, redrawn };
}

/** Lock or unlock: flips the card's lock and keeps everything else. One undo step. */
export function lockCard(board: Board, cardId: string): Board {
  return replaceCard(board, toggleLock(cardAt(board, cardId)));
}

/**
 * Discard: deletes the card; its tucked cards move up to its parent or become roots. Its
 * On Top Modifier becomes a free card where the card was.
 */
export function discardCard(board: Board, cardId: string): Board {
  const card = cardAt(board, cardId);
  const onTop = onTopCardOf(board, cardId);
  let next = removeFromStacks(board, cardId);
  if (onTop) {
    next = replaceCard(next, { ...onTop, onTopOf: null, x: card.x, y: card.y, z: nextZ(next) });
  }
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
