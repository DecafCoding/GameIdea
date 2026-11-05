/**
 * Board → React Flow nodes. Every card and note is a flat top-level node (no parentId,
 * see the Phase 3 tuck spike). Paint order: roots ranked by z; the root of rank r (from 1)
 * gets zIndex r * 1000 and the card at index i of its stack order r * 1000 - i, so a
 * tucked card paints under the card above it. Notes sit at zIndex 0 under every card. On a
 * One-Pager board the Concept panel is 1 more node at zIndex 1, beside the Hook Card; its
 * width comes from its content, so React Flow measures it. Concept cards have no node.
 * The Core Loop card is a 'loop' node ranked with the other roots by z, 240 wide with no
 * height, so React Flow measures it as it grows with its text.
 * The array is sorted by zIndex, so Tab moves through the cards in z order.
 * After Deal Stack, each dealt card carries its reveal delay (dealDelays): the dealt cards
 * fade in one at a time over about 1 second. The delays are view state, never stored.
 */
import type { Node } from '@xyflow/react';
import type { Board, Card } from '@/shared/model';
import { CONCEPT_NODE_ID, conceptPlace, conceptWidth } from './concept';
import type { Below } from './connector';
import { cardSize, HOOK_WIDTH } from './placement';
import { cardText, isOnTop } from './reading';
import { isRoot, stackOrder } from './stack';

export type CardNodeData = {
  cardId: string;
  /** Index in its stack order: 0 for a root (the paper step). */
  depth: number;
  selected: boolean;
  /** Hidden while the draw motion's clone flies in. */
  hidden: boolean;
  /** The card tucked directly below this one (next in stack order), for the connector badge. */
  below: BelowCard | null;
  /** The dragged card: the drag look. Set only in the canvas's local drag nodes. */
  lifted?: boolean;
  /** Just replaced by Redraw All: the new-card outline for 1 second. */
  fresh: boolean;
  /** Just dealt by Deal Stack: its fade-in delay in ms, else null. */
  reveal: number | null;
};
export type BelowCard = Below & { id: string };

export type NoteNodeData = { noteId: string };

/** The Concept panel of a One-Pager board: its saved width. */
export type ConceptNodeData = { width: number };

/** The Core Loop card: its id; the card comes from the store. */
export type LoopNodeData = { cardId: string };

export type CardFlowNode = Node<CardNodeData, 'card'>;
export type NoteFlowNode = Node<NoteNodeData, 'note'>;
export type ConceptFlowNode = Node<ConceptNodeData, 'concept'>;
export type LoopFlowNode = Node<LoopNodeData, 'loop'>;
export type BoardFlowNode = CardFlowNode | NoteFlowNode | ConceptFlowNode | LoopFlowNode;

export interface NodeUi {
  selectedId: string | null;
  hiddenIds: ReadonlySet<string>;
  /** Cards Redraw All just replaced. */
  freshIds?: ReadonlySet<string>;
  /** Cards Deal Stack just dealt: id → fade-in delay in ms. */
  reveal?: ReadonlyMap<string, number>;
}

export const STACK_RANK = 1000;

/** How long a whole deal takes to reveal (design 9.9, 11). */
export const DEAL_REVEAL_MS = 1000;

/** The fade-in delay of each dealt card, in reveal order: index × 1000 ms ÷ count. */
export function dealDelays(dealt: readonly string[]): ReadonlyMap<string, number> {
  return new Map(dealt.map((id, i) => [id, Math.round((i * DEAL_REVEAL_MS) / dealt.length)]));
}

/** What the connector badge needs from the card below. */
function belowCard(board: Board, card: Card | undefined): BelowCard | null {
  if (!card) return null;
  return {
    id: card.id,
    type: card.type,
    text: cardText(board, card),
    saved: card.connector ?? null,
  };
}

/** True when 2 below values would draw the same badge. */
export function sameBelow(a: BelowCard | null, b: BelowCard | null): boolean {
  if (a === null || b === null) return a === b;
  return a.id === b.id && a.type === b.type && a.text === b.text && a.saved === b.saved;
}

export function toNodes(board: Board, ui: NodeUi): BoardFlowNode[] {
  // A card on top of another has no node: it reads as part of its base card.
  // Concept cards have no canvas place: they are chips in the Concept panel node.
  const roots = board.cards
    .filter((card) => isRoot(board, card.id) && !isOnTop(board, card) && !card.inConcept)
    .sort((a, b) => a.z - b.z);
  // The Core Loop card ranks with the roots; it is never tucked and has no stack.
  const loops: LoopFlowNode[] = roots.flatMap((root, r): LoopFlowNode[] =>
    root.type === 'loop'
      ? [
          {
            id: root.id,
            type: 'loop',
            position: { x: root.x, y: root.y },
            width: HOOK_WIDTH,
            zIndex: (r + 1) * STACK_RANK,
            selectable: false,
            data: { cardId: root.id },
          },
        ]
      : [],
  );
  const cards: CardFlowNode[] = roots.flatMap((root, r) =>
    root.type === 'loop'
      ? []
      : stackOrder(board, root.id).map((card, i, order): CardFlowNode => ({
          id: card.id,
          type: 'card',
          position: { x: card.x, y: card.y },
          ...cardSize(card),
          zIndex: (r + 1) * STACK_RANK - i,
          selectable: false,
          data: {
            cardId: card.id,
            depth: i,
            below: belowCard(board, order[i + 1]),
            selected: ui.selectedId === card.id,
            hidden: ui.hiddenIds.has(card.id),
            fresh: ui.freshIds?.has(card.id) ?? false,
            reveal: ui.reveal?.get(card.id) ?? null,
          },
        })),
  );
  const notes: NoteFlowNode[] = board.notes.map((note) => ({
    id: note.id,
    type: 'note',
    position: { x: note.x, y: note.y },
    width: note.width,
    height: note.height,
    zIndex: 0,
    selectable: false,
    data: { noteId: note.id },
  }));
  // The Concept panel beside a One-Pager Hook Card: above notes, below every card.
  const place = conceptPlace(board);
  const concept: ConceptFlowNode[] = place
    ? [
        {
          id: CONCEPT_NODE_ID,
          type: 'concept',
          position: place,
          zIndex: 1,
          draggable: false,
          selectable: false,
          focusable: false,
          data: { width: conceptWidth(board) },
        },
      ]
    : [];
  const ranked: BoardFlowNode[] = [...cards, ...loops].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
  return [...notes, ...concept, ...ranked];
}
