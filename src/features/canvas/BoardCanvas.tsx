/**
 * BoardCanvas: the React Flow canvas of the open board (canvas-library in
 * docs/architecture.html). Cards and notes are flat top-level nodes with manual z order;
 * a tucked stack moves with its top card through our own code (the Phase 3 tuck spike).
 * View state (selection, hover, drag and its hint) stays here, never in the board store.
 * During a drag, positions live only in the local drag nodes; the store gets one change on
 * drop, so a drag is one undo step and one save. With Snap To Grid on, a dragged card or
 * note moves dot to dot on the 24 px grid, and a free card or note dropped on empty canvas
 * lands on it; Alt held places it freely.
 * On a One-Pager board the Concept panel is 1 more node beside the Hook Card and moves
 * with it. A card dropped with the pointer over the panel goes into the panel, onto the
 * chip under the pointer (found with document.elementsFromPoint, since chips are laid out
 * by CSS) or stays where it was released. Chips are dragged out with pointer events, not
 * as nodes; a ghost chip follows the pointer. Each drop, pop-out, drag out and resize is
 * one changeBoard: 1 undo step and 1 save.
 * Deal Stack is 1 changeBoard too; the dealt cards and chips then fade in one at a time
 * over about 1 second from a view-only reveal map (id → delay), never in the store.
 */
import '@xyflow/react/dist/base.css';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  ViewportPortal,
  type NodeChange,
  type OnNodeDrag,
  type Viewport,
} from '@xyflow/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChipView, useRingKeys, type RingSlot, type TurnDirection } from '@/features/card';
import { drawFor } from '@/features/draw';
import { moveNote } from '@/features/notes';
import { getSettings, useSettings } from '@/features/settings';
import type { Board, Deck, Pools } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import {
  chooseConnector,
  dealStack,
  discardCard,
  dropCard,
  duplicateCard,
  lockCard,
  redrawAll,
  redrawCard,
  splitCard,
  turnCardOnBoard,
} from './boardActions';
import { conceptRectOf, useCanvasUi } from './CanvasProvider';
import { CardNode, CardNodeContext, type CardNodeActions } from './CardNode';
import {
  chipResultText,
  CONCEPT_NODE_ID,
  conceptDrop,
  dragOutOfConcept,
  leaveConcept,
  onePagerHook,
  popOutOfConcept,
  resizeConcept,
  type ConceptOver,
} from './concept';
import { ConceptNode, ConceptUiContext, type ConceptHint, type ConceptUi } from './ConceptNode';
import { CountBadge } from './CountBadge';
import { DropHints, type DragHint } from './DropHints';
import { dropAction, dropTarget, hintFor, tuckLanding } from './dropZones';
import { DEAL_REVEAL_MS, dealDelays, toNodes, type BoardFlowNode } from './nodes';
import { NoteNode } from './NoteNode';
import { boardRects, CARD_SIZE, snapToGrid, type Point } from './placement';
import { cardText } from './reading';
import { descendantsOf } from './stack';
import { ZoomStrip } from './ZoomStrip';
import styles from './BoardCanvas.module.css';

const nodeTypes = { card: CardNode, note: NoteNode, concept: ConceptNode };

/** A drag shorter than this, in screen pixels, is a click and commits nothing. */
const CLICK_DISTANCE = 4;
/** How long the new-card outline shows after Redraw All (design 9.9). */
const FRESH_MS = 1000;
/** The reveal map clears this long after the deal's last fade starts. */
const DEAL_CLEAR_MS = DEAL_REVEAL_MS + 200;
/** Added to the dragged stack's zIndex so it paints above every other card. */
const DRAG_RAISE = 1_000_000;

interface DragState {
  id: string;
  kind: 'card' | 'note';
  startX: number;
  startY: number;
  /** The node's top-left at drag start, for a free (Alt) drop after a snapped drag. */
  nodeX: number;
  nodeY: number;
}

function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function pointerOf(event: MouseEvent | globalThis.MouseEvent | TouchEvent): {
  x: number;
  y: number;
} {
  if ('clientX' in event) return { x: event.clientX, y: event.clientY };
  const touch = event.changedTouches[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : { x: 0, y: 0 };
}

interface BoardCanvasProps {
  /** The loaded pools, for Redraw; null while they load or after they fail. */
  pools: Pools | null;
}

/** A chip press that may become a drag out of the Concept panel. */
interface ChipPress {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Past CLICK_DISTANCE: the chip is being dragged. */
  active: boolean;
}

/** The chip being dragged out: its card and the pointer in flow coordinates. */
interface ChipGhost {
  id: string;
  at: Point;
}

/**
 * Where a screen point is relative to the Concept panel: inside it (from the flow point
 * and the panel's measured rect) and over which chip. Null on a Free Form board. The
 * dragged node is under the pointer too, so the whole hit list is searched.
 */
function conceptOverAt(
  flow: ReturnType<typeof useReactFlow>,
  board: Board,
  screen: Point,
  point: Point,
): ConceptOver | null {
  const rect = conceptRectOf(flow, board);
  if (!rect) return null;
  const panel =
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;
  if (!panel) return { panel: false, chipId: null };
  for (const element of document.elementsFromPoint(screen.x, screen.y)) {
    const chip = element.closest('[data-card-id]');
    if (chip?.closest('[data-testid="concept-panel"]')) {
      return { panel: true, chipId: chip.getAttribute('data-card-id') };
    }
  }
  return { panel: true, chipId: null };
}

/** The snap grid while dragging: the 24 px dot grid (docs/feature-settings-and-theme.html). */
const SNAP_GRID: [number, number] = [24, 24];

/** True while the Alt key is down, so a drag can skip snap. */
function useAltHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => setHeld(event.altKey);
    const onBlur = () => setHeld(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  return held;
}

export function BoardCanvas({ pools }: BoardCanvasProps) {
  const board = useBoardStore((state) => state.board);
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const setView = useBoardStore((state) => state.setView);
  const { canvasRef, flights, setEditingNoteId, setNotice } = useCanvasUi();
  const flow = useReactFlow();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragNodes, setDragNodes] = useState<BoardFlowNode[] | null>(null);
  const [hint, setHint] = useState<DragHint | null>(null);
  const [conceptHint, setConceptHint] = useState<ConceptHint | null>(null);
  const [ghost, setGhost] = useState<ChipGhost | null>(null);
  const chipPress = useRef<ChipPress | null>(null);
  const snapOn = useSettings().snap;
  const altHeld = useAltHeld();
  const drag = useRef<DragState | null>(null);
  const hoverRef = useRef<string | null>(null);

  // Cards Redraw All just replaced: the new-card outline for 1 second (design 9.9).
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set());
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (freshTimer.current) clearTimeout(freshTimer.current);
    },
    [],
  );

  // Cards and chips Deal Stack just dealt: id → fade-in delay (design 9.9, 11).
  const [reveal, setReveal] = useState<ReadonlyMap<string, number>>(() => new Map());
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    },
    [],
  );

  const selected = selectedId && board.cards.some((c) => c.id === selectedId) ? selectedId : null;
  const hiddenIds = useMemo(() => new Set(flights.map((f) => f.card.id)), [flights]);
  const derived = useMemo(
    () => toNodes(board, { selectedId: selected, hiddenIds, freshIds, reveal }),
    [board, selected, hiddenIds, freshIds, reveal],
  );
  const nodes = dragNodes ?? derived;

  // The latest values for the stable callbacks below.
  const latest = useRef({ pools, selected });
  useEffect(() => {
    latest.current = { pools, selected };
  });

  const actions = useMemo<CardNodeActions>(
    () => ({
      hoverStart: (id: string) => {
        hoverRef.current = id;
      },
      hoverEnd: (id: string) => {
        if (hoverRef.current === id) hoverRef.current = null;
      },
      canRedraw: pools !== null,
      turn: (id: string, slot: RingSlot, direction: TurnDirection) =>
        changeBoard((b) => turnCardOnBoard(b, id, slot, direction)),
      split: (id: string) => changeBoard((b) => splitCard(b, id)),
      redraw: (id: string) => {
        const current = latest.current.pools;
        const board = useBoardStore.getState().board;
        const card = board.cards.find((c) => c.id === id);
        if (!current || !card || card.type === 'hook') return;
        // Redraw draws like a deck draw: same deck, same Modifier deck, the board's genres.
        const drawn = drawFor(card, current, board.genres);
        changeBoard((b) => redrawCard(b, id, drawn));
      },
      lock: (id: string) => changeBoard((b) => lockCard(b, id)),
      duplicate: (id: string) => changeBoard((b) => duplicateCard(b, id)),
      redrawAll: (hookId: string) => {
        const current = latest.current.pools;
        if (!current) return;
        let redrawn: string[] = [];
        changeBoard((b) => {
          const result = redrawAll(b, hookId, (card) => drawFor(card, current, b.genres));
          redrawn = result.redrawn;
          return result.board;
        });
        if (redrawn.length === 0) return;
        setFreshIds(new Set(redrawn));
        if (freshTimer.current) clearTimeout(freshTimer.current);
        freshTimer.current = setTimeout(() => setFreshIds(new Set()), FRESH_MS);
      },
      dealStack: (hookId: string) => {
        const current = latest.current.pools;
        if (!current) return;
        let dealt: string[] = [];
        changeBoard((b) => {
          const result = dealStack(b, hookId, (deck, excluded) =>
            drawFor({ type: deck }, current, b.genres, { excluded }),
          );
          dealt = result.dealt;
          return result.board;
        });
        if (dealt.length === 0) return;
        // Dealt cards get no new-card outline; they fade in instead. Set in the same
        // handler as the change, so the class is on each new node at its first render.
        setReveal(dealDelays(dealt));
        if (revealTimer.current) clearTimeout(revealTimer.current);
        revealTimer.current = setTimeout(() => setReveal(new Map()), DEAL_CLEAR_MS);
      },
      discard: (id: string) => {
        changeBoard((b) => discardCard(b, id));
        setSelectedId(null);
      },
      chooseConnector: (id: string, word: string) =>
        changeBoard((b) => chooseConnector(b, id, word)),
    }),
    [changeBoard, pools],
  );

  // R and Shift+R: the card under the pointer, else the selected card.
  useRingKeys(
    () => hoverRef.current ?? latest.current.selected,
    (id, slot) => changeBoard((b) => turnCardOnBoard(b, id, slot, 'cw')),
  );

  // Delete or Backspace discards the selected card; Esc clears the selection.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTextEntry(event.target)) return;
      if (event.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const id = latest.current.selected;
      if (!id || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      changeBoard((b) => discardCard(b, id));
      setSelectedId(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeBoard]);

  // Position changes move the dragged card's tucked cards by the same delta.
  const onNodesChange = useCallback(
    (changes: NodeChange<BoardFlowNode>[]) => {
      if (!drag.current) return;
      // The tucked cards under each moved card, read now: the updater may run after a drop
      // has already removed the card from the board.
      const b = useBoardStore.getState().board;
      // On a One-Pager board the Concept panel moves with the Hook Card during its drag.
      const hookId = onePagerHook(b)?.id ?? null;
      const tucked = new Map<string, string[]>();
      for (const change of changes) {
        if (change.type !== 'position' || !b.cards.some((c) => c.id === change.id)) continue;
        tucked.set(
          change.id,
          descendantsOf(b, change.id).map((c) => c.id),
        );
      }
      setDragNodes((current) => {
        const base = current ?? derived;
        const extra: NodeChange<BoardFlowNode>[] = [];
        for (const change of changes) {
          if (change.type !== 'position' || !change.position) continue;
          const node = base.find((n) => n.id === change.id);
          if (!node) continue;
          const dx = change.position.x - node.position.x;
          const dy = change.position.y - node.position.y;
          if (change.id === hookId) {
            const panel = base.find((n) => n.id === CONCEPT_NODE_ID);
            if (panel) {
              extra.push({
                type: 'position',
                id: CONCEPT_NODE_ID,
                position: { x: panel.position.x + dx, y: panel.position.y + dy },
              });
            }
          }
          for (const childId of tucked.get(change.id) ?? []) {
            const child = base.find((n) => n.id === childId);
            if (!child) continue;
            extra.push({
              type: 'position',
              id: childId,
              position: { x: child.position.x + dx, y: child.position.y + dy },
            });
          }
        }
        return applyNodeChanges([...changes, ...extra], base);
      });
    },
    [derived],
  );

  const onNodeDragStart: OnNodeDrag<BoardFlowNode> = useCallback(
    (event, node) => {
      // The Concept panel is never dragged.
      if (node.type === 'concept') return;
      const start = pointerOf(event);
      drag.current = {
        id: node.id,
        kind: node.type,
        startX: start.x,
        startY: start.y,
        nodeX: node.position.x,
        nodeY: node.position.y,
      };
      hoverRef.current = null;
      if (node.type !== 'card') {
        setDragNodes(derived);
        return;
      }
      const stack = new Set([
        node.id,
        ...descendantsOf(useBoardStore.getState().board, node.id).map((c) => c.id),
      ]);
      setDragNodes(
        derived.map((n) =>
          n.type === 'card' && stack.has(n.id)
            ? {
                ...n,
                zIndex: (n.zIndex ?? 0) + DRAG_RAISE,
                data: { ...n.data, lifted: n.id === node.id },
              }
            : n,
        ),
      );
    },
    [derived],
  );

  const onNodeDrag: OnNodeDrag<BoardFlowNode> = useCallback(
    (event, node) => {
      if (node.type !== 'card') return;
      const p = pointerOf(event);
      const point = flow.screenToFlowPosition(p);
      const b = useBoardStore.getState().board;
      const dragged = b.cards.find((c) => c.id === node.id);
      if (!dragged) return;
      // Over the Concept panel: the lane hint, the chip hint, or no hint at all.
      const over = conceptOverAt(flow, b, p, point);
      const concept = over ? conceptDrop(b, dragged, over) : null;
      if (concept) {
        setHint(null);
        if (concept.kind === 'enter') {
          const lane = dragged.type as Deck;
          setConceptHint((current) =>
            current?.lane === lane ? current : { lane, chipId: null, result: null },
          );
        } else if (concept.kind === 'chip') {
          const chipId = concept.chipId;
          // The result needs a trial combine, so it is worked out only when the chip changes.
          setConceptHint((current) =>
            current?.chipId === chipId
              ? current
              : { lane: null, chipId, result: chipResultText(b, dragged.id, chipId) },
          );
        } else {
          setConceptHint(null);
        }
        return;
      }
      setConceptHint(null);
      const target = dropTarget(b, node.id, point);
      const kind = hintFor(b, dragged, target, point);
      setHint((current) => {
        if (!target || !kind) return current === null ? current : null;
        const zone =
          kind === 'swapZones'
            ? dropAction(b, dragged, target, point).kind === 'swap'
              ? 'swap'
              : 'top'
            : kind === 'swapOnly'
              ? 'swap'
              : null;
        if (
          current &&
          current.target === target &&
          current.hint === kind &&
          current.zone === zone
        ) {
          return current;
        }
        // The landing spot needs a trial tuck, so it is worked out only when the hint changes.
        const landing = kind === 'slot' ? tuckLanding(b, dragged.id, target.id) : null;
        return { target, hint: kind, zone, draggedType: dragged.type, landing };
      });
    },
    [flow],
  );

  const onNodeDragStop: OnNodeDrag<BoardFlowNode> = useCallback(
    (event, node) => {
      const state = drag.current;
      drag.current = null;
      setDragNodes(null);
      setHint(null);
      setConceptHint(null);
      if (!state) return;
      const p = pointerOf(event);
      if (Math.hypot(p.x - state.startX, p.y - state.startY) < CLICK_DISTANCE) return;
      const snap = getSettings().snap && !event.altKey;
      // Live snap may have moved the node onto the grid; a free drop follows the pointer.
      const zoom = flow.getZoom();
      const { x, y } = snap
        ? node.position
        : {
            x: state.nodeX + (p.x - state.startX) / zoom,
            y: state.nodeY + (p.y - state.startY) / zoom,
          };
      if (state.kind === 'note') {
        const at = snap ? snapToGrid({ x, y }) : { x, y };
        changeBoard((b) => moveNote(b, node.id, at.x, at.y));
        return;
      }
      const point = flow.screenToFlowPosition(p);
      // A Hook Card dropped on a card only moves; the notice says why (design 9.13).
      const b = useBoardStore.getState().board;
      const dragged = b.cards.find((c) => c.id === node.id);
      const concept = conceptOverAt(flow, b, p, point) ?? undefined;
      if (dragged && !(concept && conceptDrop(b, dragged, concept))) {
        const action = dropAction(b, dragged, dropTarget(b, node.id, point), point);
        if (action.kind === 'move' && action.refused) setNotice(action.refused);
      }
      changeBoard((b) => dropCard(b, node.id, point, { x, y }, { snap, concept }));
    },
    [changeBoard, flow, setNotice],
  );

  // A chip drag out of the Concept panel: pointer events on the window, not a node drag.
  useEffect(() => {
    function hintAt(id: string, screen: Point, point: Point) {
      const b = useBoardStore.getState().board;
      if (conceptOverAt(flow, b, screen, point)?.panel) {
        setHint(null);
        return;
      }
      // The chip as a full card at the drop, for the canvas hints of 9.7 and 9.8.
      const trial = leaveConcept(b, id, { x: point.x - CARD_SIZE / 2, y: point.y - CARD_SIZE / 2 });
      const dragged = trial.cards.find((c) => c.id === id)!;
      const target = dropTarget(trial, id, point);
      const kind = hintFor(trial, dragged, target, point);
      setHint((current) => {
        if (!target || !kind) return current === null ? current : null;
        const zone =
          kind === 'swapZones'
            ? dropAction(trial, dragged, target, point).kind === 'swap'
              ? 'swap'
              : 'top'
            : kind === 'swapOnly'
              ? 'swap'
              : null;
        if (
          current &&
          current.target.id === target.id &&
          current.hint === kind &&
          current.zone === zone
        ) {
          return current;
        }
        const landing = kind === 'slot' ? tuckLanding(trial, id, target.id) : null;
        return { target, hint: kind, zone, draggedType: dragged.type, landing };
      });
    }
    function onMove(event: PointerEvent) {
      const press = chipPress.current;
      if (!press || event.pointerId !== press.pointerId) return;
      const screen = { x: event.clientX, y: event.clientY };
      if (
        !press.active &&
        Math.hypot(screen.x - press.startX, screen.y - press.startY) < CLICK_DISTANCE
      ) {
        return;
      }
      press.active = true;
      const point = flow.screenToFlowPosition(screen);
      setGhost({ id: press.id, at: point });
      hintAt(press.id, screen, point);
    }
    function end() {
      chipPress.current = null;
      setGhost(null);
      setHint(null);
    }
    function onUp(event: PointerEvent) {
      const press = chipPress.current;
      if (!press || event.pointerId !== press.pointerId) return;
      end();
      // A click or a release on the panel changes nothing.
      if (!press.active) return;
      const screen = { x: event.clientX, y: event.clientY };
      const point = flow.screenToFlowPosition(screen);
      if (conceptOverAt(flow, useBoardStore.getState().board, screen, point)?.panel) return;
      // The full card lands centered on the pointer.
      const dropAt = { x: point.x - CARD_SIZE / 2, y: point.y - CARD_SIZE / 2 };
      const snap = getSettings().snap && !event.altKey;
      changeBoard((b) => dragOutOfConcept(b, press.id, point, dropAt, { snap }));
    }
    function onCancel(event: PointerEvent) {
      if (chipPress.current?.pointerId === event.pointerId) end();
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [changeBoard, flow]);

  const startChipDrag = useCallback((id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    chipPress.current = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  }, []);

  const popOut = useCallback(
    (id: string) =>
      changeBoard((b) => {
        const panel = conceptRectOf(flow, b);
        return panel ? popOutOfConcept(b, id, panel, boardRects(b)) : b;
      }),
    [changeBoard, flow],
  );

  const resize = useCallback(
    (width: number) => changeBoard((b) => resizeConcept(b, width)),
    [changeBoard],
  );

  const draggingChipId = ghost?.id ?? null;
  const conceptUi = useMemo<ConceptUi>(
    () => ({ hint: conceptHint, draggingChipId, popOut, startChipDrag, resize, reveal }),
    [conceptHint, draggingChipId, popOut, startChipDrag, resize, reveal],
  );
  const ghostCard = ghost ? board.cards.find((c) => c.id === ghost.id) : undefined;

  // A Hook Card has a hover menu, not a strip: a click selects nothing.
  const onNodeClick = useCallback((_: MouseEvent, node: BoardFlowNode) => {
    if (node.type !== 'card') return;
    const card = useBoardStore.getState().board.cards.find((c) => c.id === node.id);
    setSelectedId(card?.type === 'hook' ? null : node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    // A focused note textarea commits its draft on blur.
    if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur();
    setEditingNoteId(null);
  }, [setEditingNoteId]);

  const onMoveEnd = useCallback(
    (_: unknown, viewport: Viewport) =>
      setView({ panX: viewport.x, panY: viewport.y, zoom: viewport.zoom }),
    [setView],
  );

  const [defaultViewport] = useState(() => ({
    x: board.view.panX,
    y: board.view.panY,
    zoom: board.view.zoom,
  }));

  return (
    <div
      ref={canvasRef}
      className={`${styles.canvas} ${dragNodes ? styles.dragging : ''}`}
      data-testid="canvas"
    >
      <CardNodeContext.Provider value={actions}>
        <ConceptUiContext.Provider value={conceptUi}>
          <ReactFlow<BoardFlowNode>
            nodes={nodes}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            zIndexMode="manual"
            elevateNodesOnSelect={false}
            nodeDragThreshold={0}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.25}
            maxZoom={2}
            deleteKeyCode={null}
            multiSelectionKeyCode={null}
            selectionKeyCode={null}
            onlyRenderVisibleElements
            snapToGrid={snapOn && !altHeld}
            snapGrid={SNAP_GRID}
            defaultViewport={defaultViewport}
            onMoveEnd={onMoveEnd}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.2}
              color="var(--canvas-dot)"
            />
            <DropHints hint={hint} />
            {ghost && ghostCard && ghostCard.type !== 'hook' && (
              <ViewportPortal>
                <div
                  className={styles.ghost}
                  style={{ left: ghost.at.x, top: ghost.at.y }}
                  data-testid="chip-ghost"
                >
                  <ChipView text={cardText(board, ghostCard)} deck={ghostCard.type} />
                </div>
              </ViewportPortal>
            )}
            <ZoomStrip />
            <CountBadge />
          </ReactFlow>
        </ConceptUiContext.Provider>
      </CardNodeContext.Provider>
    </div>
  );
}
