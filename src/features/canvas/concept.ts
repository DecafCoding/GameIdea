/**
 * The Concept panel of a One-Pager board as pure rules (docs/feature-one-pager-board.html,
 * design 9.15). A Concept card is a card with inConcept: true and tuckedUnder: null; its
 * x, y are kept but unused, and its chip order is its z. The panel's place is derived from
 * the board's 1 Hook Card and never stored; only its width is (Board.conceptWidth).
 * Read side: the panel's place, width, lanes and counts. Write side: each panel action as
 * one Board → Board recipe (enter, leave, pop out, drag out, combine on a chip, resize),
 * committed through one changeBoard, so 1 undo step and 1 save. No React and no React
 * Flow here: the rules must hold if the canvas changes. The Core Loop card never enters the
 * panel and is never a lane or a count.
 */
import { isCombined, swap } from '@/features/card';
import { BASE_TYPES, CONCEPT_WIDTH, DECKS, type Board, type Card, type Deck } from '@/shared/model';
import { combineOnto, dropCard, putOnTopOf } from './boardActions';
import { CARD_SIZE, findOpenSpot, GRID, HOOK_WIDTH, type Point, type Rect } from './placement';
import { cardText, onTopCardOf } from './reading';
import { childrenOf, descendantsOf, layoutStack, nextZ, rootOf, stackOrder } from './stack';

/** The gap between the Hook Card's right edge and the panel (design 9.15: 240 + 56). */
export const CONCEPT_GAP = 56;
/** The React Flow node id of the panel. */
export const CONCEPT_NODE_ID = 'concept-panel';

/** 1 lane of the panel: the Concept cards of 1 deck, in chip (z) order. */
export interface ConceptLane {
  deck: Deck;
  cards: Card[];
}

/** Where the pointer is during a drop: over the panel, and over which chip, if any. */
export interface ConceptOver {
  panel: boolean;
  chipId: string | null;
}

/** What a drop over the panel does. */
export type ConceptDrop = { kind: 'enter' } | { kind: 'chip'; chipId: string } | { kind: 'stay' };

/** What a Modifier dropped on a chip does: the combine rules of a full card. */
export type ChipAction = 'combine' | 'onTop' | 'swap';

function cardAt(board: Board, id: string): Card {
  const card = board.cards.find((c) => c.id === id);
  if (!card) throw new Error(`The board has no card ${id}.`);
  return card;
}

function replaceCard(board: Board, id: string, change: (card: Card) => Card): Board {
  return { ...board, cards: board.cards.map((card) => (card.id === id ? change(card) : card)) };
}

/** The Hook Card of a One-Pager board; null on a Free Form board. */
export function onePagerHook(board: Board): Card | null {
  if (board.kind !== 'onePager') return null;
  return board.cards.find((card) => card.type === 'hook') ?? null;
}

/** The panel's top-left: the Hook Card's left + 240 + 56, same top. Null on Free Form. */
export function conceptPlace(board: Board): Point | null {
  const hook = onePagerHook(board);
  return hook ? { x: hook.x + HOOK_WIDTH + CONCEPT_GAP, y: hook.y } : null;
}

function clampWidth(width: number): number {
  return Math.min(CONCEPT_WIDTH.max, Math.max(CONCEPT_WIDTH.min, Math.round(width)));
}

/** The panel width: the saved width, or the default, kept within 232 to 640. */
export function conceptWidth(board: Board): number {
  return clampWidth(board.conceptWidth ?? CONCEPT_WIDTH.default);
}

/** Every Concept card, in board order. */
export function conceptCards(board: Board): Card[] {
  return board.cards.filter((card) => card.inConcept);
}

/** 1 lane per deck that has a Concept card, in rail order; chips by z ascending. */
export function conceptLanes(board: Board): ConceptLane[] {
  const cards = conceptCards(board);
  return DECKS.map((deck) => ({
    deck,
    cards: cards.filter((card) => card.type === deck).sort((a, b) => a.z - b.z),
  })).filter((lane) => lane.cards.length > 0);
}

/**
 * The One-Pager footer count: the Hook Train (every card under the Hook Card) plus the
 * Concept cards. Not the Hook Card, not loose cards and not On Top Modifiers. 0 on Free Form.
 */
export function onePagerCardCount(board: Board): number {
  const hook = onePagerHook(board);
  if (!hook) return 0;
  return descendantsOf(board, hook.id).length + conceptCards(board).length;
}

/** The first letter of each space-separated word upper-cased ("stolen salt" → "Stolen Salt"). */
export function titleCaseWords(text: string): string {
  return text
    .split(' ')
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Enter: the card and every card in its own stack become Concept cards, each a chip in
 * its own deck's lane, in stack order (new top z values). A tucked card's old stack closes
 * the gap. On Top Modifiers keep their onTopOf and stay inConcept: false. Throws for a Hook
 * Card or on a Free Form board.
 */
export function enterConcept(board: Board, cardId: string): Board {
  if (board.kind !== 'onePager') throw new Error('Only a One-Pager board has a Concept panel.');
  const card = cardAt(board, cardId);
  if (card.type === 'hook') throw new Error('A Hook Card never goes into the Concept panel.');
  if (card.type === 'loop') {
    throw new Error('The Core Loop card never goes into the Concept panel.');
  }
  const order = stackOrder(board, cardId);
  const oldRoot = rootOf(board, cardId).id;
  const z0 = nextZ(board);
  const rank = new Map(order.map((c, i) => [c.id, i]));
  let next: Board = {
    ...board,
    cards: board.cards.map((c) => {
      const i = rank.get(c.id);
      return i === undefined ? c : { ...c, tuckedUnder: null, inConcept: true, z: z0 + i };
    }),
  };
  if (oldRoot !== cardId) next = layoutStack(next, oldRoot);
  return next;
}

/** Leave: the Concept card becomes a full card on the canvas at the point, on top. */
export function leaveConcept(board: Board, cardId: string, at: Point): Board {
  const card = cardAt(board, cardId);
  if (!card.inConcept) throw new Error('This card is not in the Concept panel.');
  const z = nextZ(board);
  return replaceCard(board, cardId, (c) => ({ ...c, inConcept: false, x: at.x, y: at.y, z }));
}

/**
 * Pop out (double-click a chip): the card leaves the panel to the open spot nearest one grid
 * step right of the panel, clear of every occupied rect and of the panel itself.
 */
export function popOutOfConcept(
  board: Board,
  cardId: string,
  panel: Rect,
  occupied: Rect[],
): Board {
  const spot = findOpenSpot({ x: panel.x + panel.width + GRID, y: panel.y }, [...occupied, panel], {
    width: CARD_SIZE,
    height: CARD_SIZE,
  });
  return leaveConcept(board, cardId, spot);
}

/**
 * Drag out: the chip leaves the panel and drops like a full card at dropAt, so a drop on
 * empty canvas places it there (snap applies) and a drop on a Hook Train card tucks,
 * combines or goes on top by the normal rules.
 */
export function dragOutOfConcept(
  board: Board,
  cardId: string,
  point: Point,
  dropAt: Point,
  options: { snap?: boolean } = {},
): Board {
  return dropCard(leaveConcept(board, cardId, dropAt), cardId, point, dropAt, options);
}

/**
 * What a card dropped on a chip does: null unless the dragged card is a Modifier and the
 * chip a Concept Player Role, Resource or Setting. A plain chip combines; a merged chip
 * with no On Top Modifier takes it on top; a chip with an On Top Modifier swaps.
 */
export function chipDropAction(board: Board, dragged: Card, chip: Card): ChipAction | null {
  if (dragged.type !== 'modifier' || dragged.id === chip.id) return null;
  if (!chip.inConcept || !BASE_TYPES.includes(chip.type)) return null;
  if (!isCombined(chip)) return 'combine';
  return onTopCardOf(board, chip.id) ? 'swap' : 'onTop';
}

/**
 * A Modifier dropped on a chip. First every card tucked under the Modifier enters the
 * panel (a Concept card never has tucked cards); then it combines, goes On Top or swaps
 * by chipDropAction. A swap leaves the returned Modifier on the canvas at dropAt. The chip
 * stays a Concept card with tuckedUnder: null. Throws when the drop is not a chip action.
 */
export function combineOntoChip(
  board: Board,
  modifierId: string,
  chipId: string,
  dropAt: Point,
): Board {
  const action = chipDropAction(board, cardAt(board, modifierId), cardAt(board, chipId));
  if (!action) throw new Error('This card does not combine with this chip.');
  let next = board;
  for (const child of childrenOf(board, modifierId)) next = enterConcept(next, child.id);
  if (action === 'combine') return combineOnto(next, modifierId, chipId);
  if (action === 'onTop') return putOnTopOf(next, modifierId, chipId);
  const result = swap(cardAt(next, chipId), cardAt(next, modifierId));
  const oldRoot = rootOf(next, modifierId).id;
  const z = nextZ(next);
  next = replaceCard(next, modifierId, (c) => ({
    ...c,
    tuckedUnder: null,
    x: dropAt.x,
    y: dropAt.y,
    z,
    rings: result.modifier.rings,
    modDeck: result.modifier.modDeck,
  }));
  if (oldRoot !== modifierId) next = layoutStack(next, oldRoot);
  return replaceCard(next, chipId, (c) => ({ ...c, rings: result.target.rings }));
}

/** The words the chip would read after the drop, in Title Case ("Stolen Salt"). */
export function chipResultText(board: Board, modifierId: string, chipId: string): string {
  const next = combineOntoChip(board, modifierId, chipId, { x: 0, y: 0 });
  return titleCaseWords(cardText(next, cardAt(next, chipId)));
}

/**
 * Resize: the panel width, rounded and kept within 232 to 640. The same board when the
 * width does not change, so a release at the same width is no undo step and no save.
 */
export function resizeConcept(board: Board, width: number): Board {
  if (board.kind !== 'onePager') throw new Error('Only a One-Pager board has a Concept panel.');
  const next = clampWidth(width);
  return next === conceptWidth(board) ? board : { ...board, conceptWidth: next };
}

/**
 * What a drop over the panel does: null when not over the panel or on a Free Form board.
 * A Hook Card or the Core Loop card stays where it is dropped; a Modifier on a chip it combines with goes onto
 * that chip, and any other Modifier stays on the canvas; every other deck card enters.
 */
export function conceptDrop(board: Board, dragged: Card, over: ConceptOver): ConceptDrop | null {
  if (board.kind !== 'onePager' || !over.panel) return null;
  if (dragged.type === 'hook' || dragged.type === 'loop') return { kind: 'stay' };
  if (dragged.type === 'modifier') {
    const chip = over.chipId ? board.cards.find((c) => c.id === over.chipId) : undefined;
    if (chip && chipDropAction(board, dragged, chip)) return { kind: 'chip', chipId: chip.id };
    return { kind: 'stay' };
  }
  return { kind: 'enter' };
}
