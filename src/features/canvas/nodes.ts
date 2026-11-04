/**
 * Board → React Flow nodes. Every card and note is a flat top-level node (no parentId,
 * see the Phase 3 tuck spike). Paint order: roots ranked by z; the root of rank r (from 1)
 * gets zIndex r * 1000 and the card at index i of its stack order r * 1000 - i, so a
 * tucked card paints under the card above it. Notes sit at zIndex 0 under every card.
 * The array is sorted by zIndex, so Tab moves through the cards in z order.
 */
import type { Node } from '@xyflow/react';
import type { Board, Card } from '@/shared/model';
import type { Below } from './connector';
import { cardSize } from './placement';
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
};
export type BelowCard = Below & { id: string };

export type NoteNodeData = { noteId: string };

export type CardFlowNode = Node<CardNodeData, 'card'>;
export type NoteFlowNode = Node<NoteNodeData, 'note'>;
export type BoardFlowNode = CardFlowNode | NoteFlowNode;

export interface NodeUi {
  selectedId: string | null;
  hiddenIds: ReadonlySet<string>;
  /** Cards Redraw All just replaced. */
  freshIds?: ReadonlySet<string>;
}

export const STACK_RANK = 1000;

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
  const cards: CardFlowNode[] = roots.flatMap((root, r) =>
    stackOrder(board, root.id).map((card, i, order): CardFlowNode => ({
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
  return [...notes, ...cards.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))];
}
