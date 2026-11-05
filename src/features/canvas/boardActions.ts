/**
 * Board actions: each user action as one pure Board → Board recipe, the unit that the
 * store's changeBoard commits (one undo step and one save in Phase 4). Never mutates its
 * input; every change returns a new board with a new cards array. Deal Stack (dealStack,
 * canDeal) fills a Hook Card's missing deal slots in one recipe. setLoopText and
 * resetLoopText edit the Core Loop card's stored text, each 1 recipe, so 1 undo step and
 * 1 save; Redraw All, Deal Stack and ring turns never touch loopText.
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
import { cueKey } from '@/features/draw';
import { buildLoopText } from '@/features/loop';
import { newId, type Board, type Card, type Deck } from '@/shared/model';
import {
  combineOntoChip,
  conceptDrop,
  conceptLanes,
  enterConcept,
  type ConceptOver,
} from './concept';
import { CORE_ORDER, dropAction, dropTarget } from './dropZones';
import {
  besideSpot,
  boardRects,
  cardSize,
  findOpenSpot,
  GRID,
  snapToGrid,
  type Point,
} from './placement';
import { loopSteps, onTopCardOf } from './reading';
import {
  childrenOf,
  descendantsOf,
  insertUnder,
  isRoot,
  layoutStack,
  moveCard,
  nextZ,
  removeFromStacks,
  rootOf,
  stackOrder,
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
    inConcept: false,
  };
  return { ...board, cards: [...board.cards, hook] };
}

/**
 * Ends a drag. point is the pointer in flow coordinates (it picks the target and zone);
 * dropAt is the card's new top-left, used when the drop lands on empty canvas. With
 * options.snap, a drop on empty canvas (a move or an untuck) lands on the 24 px grid; a
 * dragged root moves its tucked cards by the same delta. Tuck, combine, swap and On Top
 * ignore snap.
 * On a One-Pager board, options.concept says whether the pointer is over the Concept panel
 * (and which chip). A drop there goes into the panel, onto the chip, or stays where it was
 * released (a Hook Card, or a Modifier off a chip), ignoring any card under the panel.
 */
export function dropCard(
  board: Board,
  draggedId: string,
  point: Point,
  dropAt: Point,
  options: { snap?: boolean; concept?: ConceptOver } = {},
): Board {
  const dragged = cardAt(board, draggedId);
  const concept = options.concept ? conceptDrop(board, dragged, options.concept) : null;
  if (concept?.kind === 'enter') return enterConcept(board, draggedId);
  if (concept?.kind === 'chip') return combineOntoChip(board, draggedId, concept.chipId, dropAt);
  if (concept?.kind === 'stay') {
    const at = options.snap ? snapToGrid(dropAt) : dropAt;
    return isRoot(board, draggedId)
      ? moveCard(board, draggedId, at.x, at.y)
      : untuckCard(board, draggedId, at.x, at.y);
  }
  const target = dropTarget(board, draggedId, point);
  const action = dropAction(board, dragged, target, point);
  switch (action.kind) {
    case 'move': {
      const at = options.snap ? snapToGrid(dropAt) : dropAt;
      return isRoot(board, draggedId)
        ? moveCard(board, draggedId, at.x, at.y)
        : untuckCard(board, draggedId, at.x, at.y);
    }
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
    inConcept: false,
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
 * Locked cards, On Top cards (not in the stack) and Concept cards stay as they are. One recipe, so one
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
    // Concept cards have no canvas place; they are never in a stack, and the guard pins it.
    if (card.locked || card.type === 'hook' || card.inConcept) continue;
    next = redrawCard(next, card.id, draw(card));
    redrawn.push(card.id);
  }
  return { board: next, redrawn };
}

/** The Details lanes a One-Pager deal fills, in rail order (docs/feature-deal-a-stack.html). */
export const DEAL_DETAILS: readonly Deck[] = [
  'role',
  'resource',
  'setting',
  'mood',
  'twist',
  'progression',
  'constraint',
];
/** Chips a Details lane holds after a deal. */
export const DEAL_CHIPS_PER_LANE = 2;

/** What a deal still has to fill under a Hook Card. */
export interface DealSlots {
  /** Core decks with no card anywhere under the Hook Card, in core order. */
  base: Deck[];
  /** Details decks, 1 entry per missing chip, in rail order (One-Pager boards only). */
  details: Deck[];
}

/**
 * The missing deal slots of a Hook Card. Base: each core deck (Player Role, Mechanic,
 * Resource, Goal, Conflict) with no card of that deck at any depth under the Hook Card;
 * loose cards, On Top Modifiers and Concept cards do not count. Details (One-Pager boards
 * only): each of the 7 Details decks once per chip its lane lacks below 2. Throws when the
 * id is not a Hook Card.
 */
export function dealSlots(board: Board, hookId: string): DealSlots {
  if (cardAt(board, hookId).type !== 'hook') throw new Error('Only a Hook Card is dealt.');
  const present = new Set<string>(descendantsOf(board, hookId).map((card) => card.type));
  const base = CORE_ORDER.filter((type): type is Deck => type !== 'hook' && !present.has(type));
  const details: Deck[] = [];
  if (board.kind === 'onePager') {
    const counts = new Map(conceptLanes(board).map((lane) => [lane.deck, lane.cards.length]));
    for (const deck of DEAL_DETAILS) {
      const missing = Math.max(0, DEAL_CHIPS_PER_LANE - (counts.get(deck) ?? 0));
      for (let i = 0; i < missing; i++) details.push(deck);
    }
  }
  return { base, details };
}

/** True when a deal on the Hook Card would add at least 1 card. */
export function canDeal(board: Board, hookId: string): boolean {
  const { base, details } = dealSlots(board, hookId);
  return base.length + details.length > 0;
}

/**
 * Deal Stack (design 9.9, docs/feature-deal-a-stack.html): fills only the missing slots.
 * Each missing core deck is drawn and inserted, in core order, under the last card under
 * the Hook Card (reading order) whose deck comes earlier in core order, else under the Hook
 * Card; that card's non-Modifier children move under the new card (insertUnder). On a
 * One-Pager board each missing Details chip is drawn and entered at the end of its lane.
 * Each draw gets the cue keys of every card of its deck on the board (rings[0]) plus the
 * cues dealt before it. One recipe, so 1 undo step and 1 save; with nothing to fill it
 * returns the same board. The hook sentence reads the train only, so Concept cards never
 * reach it. dealt lists the new ids in reveal order: train top to bottom, then the lanes.
 */
export function dealStack(
  board: Board,
  hookId: string,
  draw: (deck: Deck, excluded: ReadonlySet<string>) => Card,
): { board: Board; dealt: string[] } {
  const { base, details } = dealSlots(board, hookId);
  if (base.length + details.length === 0) return { board, dealt: [] };

  const excluded = new Map<Deck, Set<string>>();
  const keysOf = (deck: Deck): Set<string> => {
    let keys = excluded.get(deck);
    if (!keys) {
      keys = new Set();
      for (const card of board.cards) {
        if (card.type !== deck) continue;
        for (const cue of card.rings[0]?.cues ?? []) keys.add(cueKey(cue.text));
      }
      excluded.set(deck, keys);
    }
    return keys;
  };
  const drawOne = (deck: Deck): Card => {
    const keys = keysOf(deck);
    const drawn = draw(deck, new Set(keys));
    for (const cue of drawn.rings[0]?.cues ?? []) keys.add(cueKey(cue.text));
    return { ...drawn, locked: false };
  };

  let next = board;
  const dealtBase = new Set<string>();
  for (const deck of base) {
    const drawn = drawOne(deck);
    const rank = CORE_ORDER.indexOf(deck);
    const before = descendantsOf(next, hookId).filter((card) => {
      const i = CORE_ORDER.indexOf(card.type);
      return i >= 0 && i < rank;
    });
    const parentId = before.length > 0 ? before[before.length - 1]!.id : hookId;
    next = insertUnder(next, drawn, parentId);
    dealtBase.add(drawn.id);
  }

  const dealtDetails = new Set<string>();
  for (const deck of details) {
    const drawn = drawOne(deck);
    next = {
      ...next,
      cards: [...next.cards, { ...drawn, tuckedUnder: null, onTopOf: null, z: nextZ(next) }],
    };
    next = enterConcept(next, drawn.id);
    dealtDetails.add(drawn.id);
  }

  const dealt = [
    ...descendantsOf(next, hookId)
      .filter((card) => dealtBase.has(card.id))
      .map((card) => card.id),
    ...conceptLanes(next).flatMap((lane) =>
      lane.cards.filter((card) => dealtDetails.has(card.id)).map((card) => card.id),
    ),
  ];
  return { board: next, dealt };
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

/**
 * Duplicate: a copy of the card on a free spot beside it, on top of every other card. A
 * Hook Card copies its whole stack, so the copy shows the same hook; any other card copies
 * only itself. On Top Modifiers come along with their base cards. Each copy gets a new id
 * and keeps its rings, active cues, lock and badge word.
 */
export function duplicateCard(board: Board, cardId: string, createId: () => string = newId): Board {
  const card = cardAt(board, cardId);
  const stack = card.type === 'hook' ? stackOrder(board, cardId) : [card];
  const onTops = stack.map((c) => onTopCardOf(board, c.id)).filter((c): c is Card => c !== null);
  const ids = new Map([...stack, ...onTops].map((c) => [c.id, createId()]));

  // The free spot nearest one grid step right of the stack, sized to the whole stack.
  const left = Math.min(...stack.map((c) => c.x));
  const top = Math.min(...stack.map((c) => c.y));
  const right = Math.max(...stack.map((c) => c.x + cardSize(c).width));
  const bottom = Math.max(...stack.map((c) => c.y + cardSize(c).height));
  const spot = findOpenSpot({ x: right + GRID, y: top }, boardRects(board), {
    width: right - left,
    height: bottom - top,
  });
  const dx = spot.x - left;
  const dy = spot.y - top;

  // The copies keep their paint order, above every card on the board.
  const z0 = nextZ(board);
  const byZ = [...stack, ...onTops].sort((a, b) => a.z - b.z);
  const copies = byZ.map((c, i): Card => ({
    ...c,
    id: ids.get(c.id)!,
    x: c.x + dx,
    y: c.y + dy,
    z: z0 + i,
    tuckedUnder:
      c.id === cardId || c.tuckedUnder === null ? null : (ids.get(c.tuckedUnder) ?? null),
    onTopOf: c.onTopOf === null ? null : (ids.get(c.onTopOf) ?? null),
    rings: c.rings.map((r) => ({ ...r, cues: [...r.cues] })),
  }));
  return { ...board, cards: [...board.cards, ...copies] };
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

function loopCardAt(board: Board, cardId: string): Card {
  const card = cardAt(board, cardId);
  if (card.type !== 'loop') throw new Error('Only a Core Loop card has loop text.');
  return card;
}

/** The Core Loop card without its loopText key (removed, never set to undefined). */
function withoutLoopText(card: Card): Card {
  const { loopText: _drop, ...rest } = card;
  void _drop;
  return rest;
}

/**
 * Commits the Core Loop edit field (on blur). The shown text is the stored loopText, else
 * the live text. A blank text removes loopText, so the field follows the cards again; a
 * text equal to the shown text changes nothing; any other text is stored exactly as typed.
 * Returns the same board when nothing changes, so no undo step and no save. Throws unless
 * the card is a Core Loop card.
 */
export function setLoopText(board: Board, cardId: string, text: string): Board {
  const card = loopCardAt(board, cardId);
  if (text.trim() === '') {
    return card.loopText === undefined ? board : replaceCard(board, withoutLoopText(card));
  }
  const shown = card.loopText ?? buildLoopText(loopSteps(board)).text;
  return text === shown ? board : replaceCard(board, { ...card, loopText: text });
}

/**
 * Reset From Cards: removes the Core Loop card's loopText, so the field shows the live text
 * again. The same board when there is none. Throws unless the card is a Core Loop card.
 */
export function resetLoopText(board: Board, cardId: string): Board {
  const card = loopCardAt(board, cardId);
  return card.loopText === undefined ? board : replaceCard(board, withoutLoopText(card));
}
