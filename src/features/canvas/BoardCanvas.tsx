/**
 * BoardCanvas: the React Flow canvas of the open board (canvas-library in
 * docs/architecture.html). Cards and notes are flat top-level nodes with manual z order;
 * a tucked stack moves with its top card through our own code (the Phase 3 tuck spike).
 * View state (selection, hover, drag and its hint) stays here, never in the board store.
 * During a drag, positions live only in the local drag nodes; the store gets one change on
 * drop, so a drag is one undo step and one save. With Snap To Grid on, a dragged card or
 * note moves dot to dot on the 24 px grid, and a free card or note dropped on empty canvas
 * lands on it; Alt held places it freely.
 */
import '@xyflow/react/dist/base.css';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type NodeChange,
  type OnNodeDrag,
  type Viewport,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useRingKeys, type RingSlot, type TurnDirection } from '@/features/card';
import { drawFor } from '@/features/draw';
import { moveNote } from '@/features/notes';
import { getSettings, useSettings } from '@/features/settings';
import type { Pools } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import {
  chooseConnector,
  discardCard,
  dropCard,
  duplicateCard,
  lockCard,
  redrawAll,
  redrawCard,
  splitCard,
  turnCardOnBoard,
} from './boardActions';
import { useCanvasUi } from './CanvasProvider';
import { CardNode, CardNodeContext, type CardNodeActions } from './CardNode';
import { CountBadge } from './CountBadge';
import { DropHints, type DragHint } from './DropHints';
import { dropAction, dropTarget, hintFor, tuckLanding } from './dropZones';
import { toNodes, type BoardFlowNode } from './nodes';
import { NoteNode } from './NoteNode';
import { snapToGrid } from './placement';
import { descendantsOf } from './stack';
import { ZoomStrip } from './ZoomStrip';
import styles from './BoardCanvas.module.css';

const nodeTypes = { card: CardNode, note: NoteNode };

/** A drag shorter than this, in screen pixels, is a click and commits nothing. */
const CLICK_DISTANCE = 4;
/** How long the new-card outline shows after Redraw All (design 9.9). */
const FRESH_MS = 1000;
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

  const selected = selectedId && board.cards.some((c) => c.id === selectedId) ? selectedId : null;
  const hiddenIds = useMemo(() => new Set(flights.map((f) => f.card.id)), [flights]);
  const derived = useMemo(
    () => toNodes(board, { selectedId: selected, hiddenIds, freshIds }),
    [board, selected, hiddenIds, freshIds],
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
      if (dragged) {
        const action = dropAction(b, dragged, dropTarget(b, node.id, point), point);
        if (action.kind === 'move' && action.refused) setNotice(action.refused);
      }
      changeBoard((b) => dropCard(b, node.id, point, { x, y }, { snap }));
    },
    [changeBoard, flow, setNotice],
  );

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
          <ZoomStrip />
          <CountBadge />
        </ReactFlow>
      </CardNodeContext.Provider>
    </div>
  );
}
