/**
 * CanvasProvider: wraps React Flow's provider and holds the canvas UI state that the
 * board screen shares with the canvas: the note being edited, the draw-motion flights and
 * the canvas notice.
 * useCanvasApi gives app/ the canvas functions without importing React Flow, including the
 * rects new cards and notes must avoid (the Concept and Questions panels' measured rects
 * among them).
 * None of this state enters the board store (it is never an undo step or a save).
 */
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { Board, Card } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import { CONCEPT_NODE_ID, conceptPlace, conceptWidth } from './concept';
import { DrawFlight, type Flight } from './DrawFlight';
import { boardRects, type Point, type Rect } from './placement';
import { QUESTIONS_NODE_ID, QUESTIONS_WIDTH, questionsPlace } from './questionsPlace';

/** The panel's height before React Flow has measured it. */
const UNMEASURED_PANEL_HEIGHT = 120;

/**
 * The Concept panel's rect in flow coordinates: its place from the Hook Card and its
 * measured size (before measurement, the board width × 120). Null on a Free Form board.
 */
export function conceptRectOf(flow: ReturnType<typeof useReactFlow>, board: Board): Rect | null {
  const place = conceptPlace(board);
  if (!place) return null;
  const measured = flow.getInternalNode(CONCEPT_NODE_ID)?.measured;
  return {
    ...place,
    width: measured?.width ?? conceptWidth(board),
    height: measured?.height ?? UNMEASURED_PANEL_HEIGHT,
  };
}

/**
 * The Questions panel's rect in flow coordinates: its place below the Core Loop card's
 * measured height and its own measured size (before measurement, 240 × 120). Null on a
 * Free Form board.
 */
export function questionsRectOf(flow: ReturnType<typeof useReactFlow>, board: Board): Rect | null {
  const loopId = board.cards.find((card) => card.type === 'loop')?.id;
  const loopHeight = loopId ? flow.getInternalNode(loopId)?.measured.height : undefined;
  const place = questionsPlace(board, loopHeight);
  if (!place) return null;
  const measured = flow.getInternalNode(QUESTIONS_NODE_ID)?.measured;
  return {
    ...place,
    width: measured?.width ?? QUESTIONS_WIDTH,
    height: measured?.height ?? UNMEASURED_PANEL_HEIGHT,
  };
}

/** A canvas notice the board screen shows as a banner (design 9.13). */
export type CanvasNotice = 'hookCannotTuck';

interface CanvasUi {
  canvasRef: RefObject<HTMLDivElement | null>;
  notice: CanvasNotice | null;
  setNotice: Dispatch<SetStateAction<CanvasNotice | null>>;
  editingNoteId: string | null;
  setEditingNoteId: Dispatch<SetStateAction<string | null>>;
  flights: Flight[];
  addFlight: (flight: Flight) => void;
  endFlight: (key: number) => void;
}

const CanvasUiContext = createContext<CanvasUi | null>(null);

export function useCanvasUi(): CanvasUi {
  const ui = useContext(CanvasUiContext);
  if (!ui) throw new Error('The canvas needs a CanvasProvider above it.');
  return ui;
}

export function CanvasProvider({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <CanvasUiProvider>{children}</CanvasUiProvider>
    </ReactFlowProvider>
  );
}

function CanvasUiProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [notice, setNotice] = useState<CanvasNotice | null>(null);
  const addFlight = useCallback((flight: Flight) => setFlights((list) => [...list, flight]), []);
  const endFlight = useCallback(
    (key: number) => setFlights((list) => list.filter((f) => f.key !== key)),
    [],
  );
  const ui = useMemo(
    () => ({
      canvasRef,
      notice,
      setNotice,
      editingNoteId,
      setEditingNoteId,
      flights,
      addFlight,
      endFlight,
    }),
    [notice, editingNoteId, flights, addFlight, endFlight],
  );
  return (
    <CanvasUiContext.Provider value={ui}>
      {children}
      <DrawFlight flights={flights} onDone={endFlight} />
    </CanvasUiContext.Provider>
  );
}

/** The draw duration from the --t-draw token: 250 ms, or 0 under reduced motion. */
function drawDuration(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--t-draw').trim();
  const ms = value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
  return Number.isFinite(ms) ? ms : 0;
}

let flightKey = 0;

export interface CanvasApi {
  /** The center of the visible canvas, in flow coordinates. */
  viewCenter: () => Point;
  flowToScreen: (point: Point) => Point;
  /** Plays the draw motion from a deck button to the card's place. */
  flyIn: (cardId: string, from: DOMRect) => void;
  /** Opens a note in edit mode. */
  editNote: (id: string) => void;
  /** The current canvas notice, and a way to clear it (Dismiss). */
  notice: CanvasNotice | null;
  dismissNotice: () => void;
  /**
   * Every card and note rect, plus the measured Concept and Questions panels on a One-Pager
   * board, so new draws, notes and Hook Cards land off the panels.
   */
  occupiedRects: () => Rect[];
  /** The Concept panel's rect, or null on a Free Form board. */
  conceptRect: () => Rect | null;
}

export function useCanvasApi(): CanvasApi {
  const flow = useReactFlow();
  const { canvasRef, addFlight, setEditingNoteId, notice, setNotice } = useCanvasUi();
  return useMemo(
    () => ({
      viewCenter: () => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return flow.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      },
      flowToScreen: (point) => flow.flowToScreenPosition(point),
      flyIn: (cardId, from) => {
        const duration = drawDuration();
        if (duration <= 0) return;
        const card: Card | undefined = useBoardStore
          .getState()
          .board.cards.find((c) => c.id === cardId);
        if (!card) return;
        addFlight({
          key: ++flightKey,
          card,
          from,
          to: flow.flowToScreenPosition({ x: card.x, y: card.y }),
          zoom: flow.getViewport().zoom,
          duration,
        });
      },
      editNote: (id) => setEditingNoteId(id),
      notice,
      dismissNotice: () => setNotice(null),
      occupiedRects: () => {
        const board = useBoardStore.getState().board;
        const panels = [conceptRectOf(flow, board), questionsRectOf(flow, board)].filter(
          (rect): rect is Rect => rect !== null,
        );
        return [...boardRects(board), ...panels];
      },
      conceptRect: () => conceptRectOf(flow, useBoardStore.getState().board),
    }),
    [flow, canvasRef, addFlight, setEditingNoteId, notice, setNotice],
  );
}
