/**
 * CardNode: one card as a React Flow node. Node data holds ids and view flags only; the
 * card itself comes from the store with a per-card selector, so a turn re-renders one node.
 * Each card shows its strip menu in a NodeToolbar (which paints above every node) while the
 * pointer is over the card or the menu, the same way the Hook Card shows its menu.
 * A card with a tucked card below it may show the connector badge on the seam: this node
 * paints above the tucked one, so the badge sits on top of both cards.
 */
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import { createContext, memo, useContext, useRef, useState, type MouseEvent } from 'react';
import {
  CardStrip,
  CardView,
  isCombined,
  type CardPaper,
  type RingSlot,
  type TurnDirection,
} from '@/features/card';
import { buildHookSentence, HookCard, HookMenu } from '@/features/hook';
import { useBoardStore } from '@/shared/store';
import { connectorFor } from './connector';
import { ConnectorBadge } from './ConnectorBadge';
import { sameBelow, type CardFlowNode } from './nodes';
import { HOOK_INSET } from './placement';
import { stackEntries } from './reading';
import { childrenOf } from './stack';
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
  /** Redraws every unlocked card in the Hook Card's stack (one undo step). */
  redrawAll: (hookId: string) => void;
  /** Saves the connector word on the tucked card below the badge. */
  chooseConnector: (cardId: string, word: string) => void;
}

export const CardNodeContext = createContext<CardNodeActions | null>(null);

/** The strip's bottom sits 4 px above the card's top (user 2026-11-03; design 9.4 said 56). */
const STRIP_GAP = 4;

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

/**
 * Hover state for a card's menu: on while the pointer is over the card or the menu, off as
 * soon as it leaves both. Cards also call enter on pointer move, because a browser may not
 * send pointerenter to a card that ends up under a still pointer after a drop. The menu sits on a transparent bridge (STRIP_GAP tall) that
 * reaches down to the card, so the pointer never crosses empty canvas between the two.
 */
function useHoverMenu() {
  const [hover, setHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enter = () => setHover(true);
  const leave = (event: PointerEvent) => {
    const to = event.relatedTarget;
    if (to instanceof Node && (cardRef.current?.contains(to) || menuRef.current?.contains(to))) {
      return;
    }
    setHover(false);
  };
  return { hover, cardRef, menuRef, enter, leave };
}

/**
 * The Hook Card's face and hover menu: the sentence is computed from the store on each
 * change (a string, so the node re-renders only when the words change) and never stored.
 * The menu shows while the pointer is over the Hook Card or the menu.
 */
function HookBody({ hookId, actions }: { hookId: string; actions: CardNodeActions }) {
  const sentence = useBoardStore((state) => buildHookSentence(stackEntries(state.board, hookId)));
  const empty = useBoardStore((state) => childrenOf(state.board, hookId).length === 0);
  const { hover, cardRef, menuRef, enter, leave } = useHoverMenu();

  return (
    <div
      ref={cardRef}
      className={styles.hookBody}
      onPointerEnter={enter}
      onPointerMove={enter}
      onPointerLeave={(event) => leave(event.nativeEvent)}
    >
      <HookCard sentence={sentence} empty={empty} />
      <NodeToolbar isVisible position={Position.Top} offset={0}>
        <div
          ref={menuRef}
          style={{ paddingBottom: STRIP_GAP, pointerEvents: hover ? undefined : 'none' }}
          onPointerEnter={enter}
          onPointerLeave={(event) => leave(event.nativeEvent)}
        >
          <HookMenu
            sentence={sentence}
            hasStack={!empty}
            poolsReady={actions.canRedraw}
            visible={hover}
            onRedrawAll={() => actions.redrawAll(hookId)}
            onDiscard={() => actions.discard(hookId)}
          />
        </div>
      </NodeToolbar>
    </div>
  );
}

function CardNodeView({ data }: NodeProps<CardFlowNode>) {
  const card = useBoardStore((state) => state.board.cards.find((c) => c.id === data.cardId));
  // The ring of the Modifier on top of this card: the same object until that card changes.
  const onTop = useBoardStore(
    (state) => state.board.cards.find((c) => c.onTopOf === data.cardId)?.rings[0],
  );
  const actions = useContext(CardNodeContext);
  const { hover: menuHover, cardRef, menuRef, enter: menuEnter, leave: menuLeave } = useHoverMenu();
  // Focus in the strip keeps it open (after a click, or from the keyboard).
  const [stripFocused, setStripFocused] = useState(false);
  if (!card || !actions) return null;
  const id = card.id;
  const below = data.below;
  const connector = below ? connectorFor(card.type, below) : null;

  const classes = [
    styles.node,
    data.selected ? styles.selected : '',
    data.lifted ? styles.lifted : '',
    data.hidden ? styles.hidden : '',
    data.fresh ? styles.fresh : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (card.type === 'hook') {
    return (
      <div className={`${classes} ${styles.hookNode}`}>
        <div className={styles.inner}>
          <HookBody hookId={id} actions={actions} />
          {below && connector && (
            <ConnectorBadge
              connector={connector}
              nextText={below.text}
              left={HOOK_INSET}
              onChoose={(word) => actions.chooseConnector(below.id, word)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={classes}
      data-selected={data.selected || undefined}
      onPointerEnter={() => {
        actions.hoverStart(id);
        menuEnter();
      }}
      onPointerMove={menuEnter}
      onPointerLeave={(event) => {
        actions.hoverEnd(id);
        menuLeave(event.nativeEvent);
      }}
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
      <NodeToolbar
        isVisible={(menuHover && !data.lifted) || stripFocused}
        position={Position.Top}
        offset={0}
      >
        <div
          ref={menuRef}
          style={{ paddingBottom: STRIP_GAP }}
          onPointerEnter={menuEnter}
          onPointerLeave={(event) => menuLeave(event.nativeEvent)}
          onFocus={() => setStripFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setStripFocused(false);
          }}
        >
          <CardStrip
            canSplit={isCombined(card) || onTop !== undefined}
            locked={card.locked}
            redrawDisabled={!actions.canRedraw}
            onSplit={() => actions.split(id)}
            onRedraw={() => actions.redraw(id)}
            onLock={() => actions.lock(id)}
            onDiscard={() => actions.discard(id)}
          />
        </div>
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
    x.fresh === y.fresh &&
    x.lifted === y.lifted
  );
}

export const CardNode = memo(CardNodeView, sameData);
