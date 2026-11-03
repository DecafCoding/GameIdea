/**
 * CardNode: one card as a React Flow node. Node data holds ids and view flags only; the
 * card itself comes from the store with a per-card selector, so a turn re-renders one node.
 * The selected card shows the strip in a NodeToolbar, which paints above every node.
 * A card with a tucked card below it may show the connector badge on the seam: this node
 * paints above the tucked one, so the badge sits on top of both cards.
 */
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { createContext, memo, useContext, type MouseEvent } from 'react';
import {
  CardStrip,
  CardView,
  isCombined,
  type CardPaper,
  type RingSlot,
  type TurnDirection,
} from '@/features/card';
import { useBoardStore } from '@/shared/store';
import { connectorFor } from './connector';
import { ConnectorBadge } from './ConnectorBadge';
import { sameBelow, type CardFlowNode } from './nodes';
import styles from './CardNode.module.css';

/** Stable callbacks from the canvas to its card nodes. */
export interface CardNodeActions {
  /** The pointer entered or left a card (the R key target). */
  hoverStart: (cardId: string) => void;
  hoverEnd: (cardId: string) => void;
  canRedraw: boolean;
  turn: (cardId: string, slot: RingSlot, direction: TurnDirection) => void;
  split: (cardId: string) => void;
  redraw: (cardId: string) => void;
  lock: (cardId: string) => void;
  discard: (cardId: string) => void;
  /** Saves the connector word on the tucked card below the badge. */
  chooseConnector: (cardId: string, word: string) => void;
}

export const CardNodeContext = createContext<CardNodeActions | null>(null);

/** The strip's bottom sits 56 px above the card's top (design 9.4). */
const STRIP_OFFSET = 56;

/** The paper step for a stack depth: deeper than 4 reuses the 4th step (design 9.7). */
function paperFor(depth: number): CardPaper {
  if (depth === 0) return 'top';
  return `under-${Math.min(depth, 4) as 1 | 2 | 3 | 4}`;
}

/** Ring-half clicks turn the ring; they must not select the card. */
function stopRingClick(event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('[data-ring]')) {
    event.stopPropagation();
  }
}

function CardNodeView({ data }: NodeProps<CardFlowNode>) {
  const card = useBoardStore((state) => state.board.cards.find((c) => c.id === data.cardId));
  // The ring of the Modifier on top of this card: the same object until that card changes.
  const onTop = useBoardStore(
    (state) => state.board.cards.find((c) => c.onTopOf === data.cardId)?.rings[0],
  );
  const actions = useContext(CardNodeContext);
  if (!card || !actions) return null;
  const id = card.id;
  const below = data.below;
  const connector = below ? connectorFor(card.type, below) : null;

  const classes = [
    styles.node,
    data.selected ? styles.selected : '',
    data.lifted ? styles.lifted : '',
    data.hidden ? styles.hidden : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-selected={data.selected || undefined}
      onPointerEnter={() => actions.hoverStart(id)}
      onPointerLeave={() => actions.hoverEnd(id)}
      onClick={stopRingClick}
    >
      <div className={styles.inner}>
        <CardView
          card={card}
          onTurn={(slot, direction) => actions.turn(id, slot, direction)}
          ringClassName="nodrag"
          paper={paperFor(data.depth)}
          onTop={onTop}
        />
        {below && connector && (
          <ConnectorBadge
            connector={connector}
            nextText={below.text}
            onChoose={(word) => actions.chooseConnector(below.id, word)}
          />
        )}
      </div>
      <NodeToolbar isVisible={data.selected} position={Position.Top} offset={STRIP_OFFSET}>
        <CardStrip
          canSplit={isCombined(card) || onTop !== undefined}
          locked={card.locked}
          redrawDisabled={!actions.canRedraw}
          onSplit={() => actions.split(id)}
          onRedraw={() => actions.redraw(id)}
          onLock={() => actions.lock(id)}
          onDiscard={() => actions.discard(id)}
        />
      </NodeToolbar>
    </div>
  );
}

/** Re-render only when this node's own view flags change, not on every new node object. */
function sameData(a: NodeProps<CardFlowNode>, b: NodeProps<CardFlowNode>): boolean {
  const x = a.data;
  const y = b.data;
  return (
    x.cardId === y.cardId &&
    x.depth === y.depth &&
    sameBelow(x.below, y.below) &&
    x.selected === y.selected &&
    x.hidden === y.hidden &&
    x.lifted === y.lifted
  );
}

export const CardNode = memo(CardNodeView, sameData);
