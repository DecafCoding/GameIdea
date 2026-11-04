/**
 * CardNode: one card as a React Flow node. Node data holds ids and view flags only; the
 * card itself comes from the store with a per-card selector, so a turn re-renders one node.
 * Each card shows its strip menu in a NodeToolbar (which paints above every node) while the
 * pointer is over the card or the menu, the same way the Hook Card shows its menu. A card
 * tucked under another card shows no strip menu; the Hook Card always shows its menu.
 * A card with a tucked card below it may show the connector badge on the seam: this node
 * paints above the tucked one, so the badge sits on top of both cards.
 * A tucked card has a Lock / Unlock button just outside its right edge, in its visible
 * bottom band: shown on hover while unlocked, and always while locked.
 */
import { NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type WheelEvent,
} from 'react';
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
import { Icon } from '@/shared/ui';
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
  /** Copies the card beside it; a Hook Card copies its whole stack. */
  duplicate: (cardId: string) => void;
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

/** A menu stays this long after the pointer leaves both the card and the menu (user 2026-11-03). */
const MENU_HIDE_MS = 1000;

/** Closes the one hover menu now open, so a lingering menu never covers another card. */
let closeOpenMenu: (() => void) | null = null;

/**
 * Hover state for a card's menu: on while the pointer is over the card or the menu, off
 * MENU_HIDE_MS after it leaves both. Only one menu is open at a time: entering another card
 * closes the last one at once, and so does a press anywhere outside the card and its menu.
 * The menu sits on a transparent bridge (STRIP_GAP tall) that reaches down to the card.
 * Cards also call enter on pointer move, because a browser may not send pointerenter to a
 * card that ends up under a still pointer after a drop.
 */
function useHoverMenu() {
  const [hover, setHover] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useRef<() => void>(() => {});

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };
  // eslint-disable-next-line react-hooks/refs -- set once; read only from event handlers
  close.current = () => {
    clearTimer();
    setHover(false);
    if (closeOpenMenu === close.current) closeOpenMenu = null;
  };

  useEffect(() => {
    if (!hover) return;
    const onPointerDown = (event: PointerEvent) => {
      const at = event.target;
      if (at instanceof Node && (cardRef.current?.contains(at) || menuRef.current?.contains(at))) {
        return;
      }
      close.current();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [hover]);

  useEffect(
    () => () => {
      clearTimer();
      if (closeOpenMenu === close.current) closeOpenMenu = null;
    },
    [],
  );

  const enter = () => {
    clearTimer();
    if (closeOpenMenu !== close.current) {
      closeOpenMenu?.();
      closeOpenMenu = close.current;
    }
    setHover(true);
  };
  const leave = (event: PointerEvent) => {
    const to = event.relatedTarget;
    if (to instanceof Node && (cardRef.current?.contains(to) || menuRef.current?.contains(to))) {
      return;
    }
    clearTimer();
    hideTimer.current = setTimeout(() => close.current(), MENU_HIDE_MS);
  };
  return { hover, cardRef, menuRef, enter, leave };
}

/** Pixels per wheel line, for browsers that report wheel steps in lines (Firefox). */
const WHEEL_LINE_PX = 16;

/**
 * The wheel over the Hook Card scrolls its sentence, not the canvas zoom (user 2026-11-03).
 * The card carries React Flow's nowheel class; over the text the browser scrolls it, and
 * anywhere else on the card this handler scrolls the text by the same amount.
 */
function scrollHookText(event: WheelEvent<HTMLDivElement>) {
  const text = event.currentTarget.querySelector<HTMLElement>('[data-hook-text]');
  if (!text || (event.target instanceof Node && text.contains(event.target))) return;
  const step = event.deltaMode === 1 ? WHEEL_LINE_PX : 1;
  text.scrollTop += event.deltaY * step;
}

/**
 * The Hook Card's face and hover menu: the sentence is computed from the store on each
 * change (a string, so the node re-renders only when the words change) and never stored.
 * The menu shows while the pointer is over the Hook Card or the menu. The wheel over the
 * card scrolls the sentence instead of zooming the canvas.
 */
function HookBody({ hookId, actions }: { hookId: string; actions: CardNodeActions }) {
  const sentence = useBoardStore((state) => buildHookSentence(stackEntries(state.board, hookId)));
  const empty = useBoardStore((state) => childrenOf(state.board, hookId).length === 0);
  const { hover, cardRef, menuRef, enter, leave } = useHoverMenu();

  return (
    <div
      ref={cardRef}
      className={`${styles.hookBody} nowheel`}
      onWheel={scrollHookText}
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
            onDuplicate={() => actions.duplicate(hookId)}
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
  // A tucked card shows no strip menu (user 2026-11-03).
  const tucked = card.tuckedUnder != null;

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
        {tucked && (
          <button
            type="button"
            className={`${styles.tuckLock} nodrag nopan`}
            aria-label={card.locked ? 'Unlock' : 'Lock'}
            title={card.locked ? 'Unlock' : 'Lock'}
            aria-pressed={card.locked}
            data-testid="tuck-lock"
            onClick={(event) => {
              // Lock only: the click must not select the card.
              event.stopPropagation();
              actions.lock(id);
            }}
          >
            <Icon name={card.locked ? 'lock' : 'lock-open'} size={14} />
          </button>
        )}
      </div>
      <NodeToolbar
        isVisible={!tucked && ((menuHover && !data.lifted) || stripFocused)}
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
            onDuplicate={() => actions.duplicate(id)}
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
