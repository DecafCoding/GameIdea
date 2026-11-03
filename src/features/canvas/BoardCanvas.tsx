/**
 * BoardCanvas: the React Flow canvas of the open board (canvas-library in
 * docs/architecture.html). Cards and notes are flat top-level nodes with manual z order;
 * a tucked stack moves with its top card through our own code (the Phase 3 tuck spike).
 * View state (selection, hover, drag and its hint) stays here, never in the board store.
 * During a drag, positions live only in the local drag nodes; the store gets one change on
 * drop, so a drag is one undo step and one save.
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
import { drawCard } from '@/features/draw';
import { moveNote } from '@/features/notes';
import type { Pools } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import {
  chooseConnector,
  discardCard,
  dropCard,
  redrawCard,
  splitCard,
  turnCardOnBoard,
} from './boardActions';
import { useCanvasUi } from './CanvasProvider';
import { CardNode, CardNodeContext, type CardNodeActions } from './CardNode';
import { CountBadge } from './CountBadge';
import { DropHints, type DragHint } from './DropHints';
import { dropAction, dropTarget, hintFor } from './dropZones';
import { toNodes, type BoardFlowNode } from './nodes';
import { NoteNode } from './NoteNode';
import { descendantsOf } from './stack';
import { ZoomStrip } from './ZoomStrip';
import styles from './BoardCanvas.module.css';

const nodeTypes = { card: CardNode, note: NoteNode };

/** A drag shorter than this, in screen pixels, is a click and commits nothing. */
const CLICK_DISTANCE = 4;
/** Added to the dragged stack's zIndex so it paints above every other card. */
const DRAG_RAISE = 1_000_000;

interface DragState {
  id: string;
  kind: 'card' | 'note';
  startX: number;
  startY: number;
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

export function BoardCanvas({ pools }: BoardCanvasProps) {
  const board = useBoardStore((state) => state.board);
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const setView = useBoardStore((state) => state.setView);
  const { canvasRef, flights, setEditingNoteId } = useCanvasUi();
  const flow = useReactFlow();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragNodes, setDragNodes] = useState<BoardFlowNode[] | null>(null);
  const [hint, setHint] = useState<DragHint | null>(null);
  const drag = useRef<DragState | null>(null);
  const hoverRef = useRef<string | null>(null);

  const selected = selectedId && board.cards.some((c) => c.id === selectedId) ? selectedId : null;
  const hiddenIds = useMemo(() => new Set(flights.map((f) => f.card.id)), [flights]);
  const derived = useMemo(
    () => toNodes(board, { selectedId: selected, hiddenIds }),
    [board, selected, hiddenIds],
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
        if (!current || !card) return;
        // Redraw draws like a deck draw; none of the 5 Phase 1 decks is genre-tagged.
        const drawn = drawCard(card.type, current[card.type], null);
        changeBoard((b) => redrawCard(b, id, drawn));
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
      drag.current = { id: node.id, kind: node.type, startX: start.x, startY: start.y };
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
      const kind = hintFor(dragged, target, point);
      setHint((current) => {
        if (!target || !kind) return current === null ? current : null;
        const zone =
          kind === 'swapZones'
            ? dropAction(dragged, target, point).kind === 'swap'
              ? 'swap'
              : 'top'
            : null;
        if (
          current &&
          current.target === target &&
          current.hint === kind &&
          current.zone === zone
        ) {
          return current;
        }
        return { target, hint: kind, zone, draggedType: dragged.type };
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
      const { x, y } = node.position;
      if (state.kind === 'note') {
        changeBoard((b) => moveNote(b, node.id, x, y));
        return;
      }
      const point = flow.screenToFlowPosition(p);
      changeBoard((b) => dropCard(b, node.id, point, { x, y }));
    },
    [changeBoard, flow],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: BoardFlowNode) => {
    if (node.type === 'card') setSelectedId(node.id);
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
            color="color-mix(in srgb, var(--grid-dot) 50%, transparent)"
          />
          <DropHints hint={hint} />
          <ZoomStrip />
          <CountBadge />
        </ReactFlow>
      </CardNodeContext.Provider>
    </div>
  );
}
