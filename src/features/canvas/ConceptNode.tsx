/**
 * ConceptNode: the Concept panel of a One-Pager board as 1 React Flow node beside the Hook
 * Card (design 9.15). A header (the list icon and "Details", no count), then 1 lane per deck that has
 * a Concept card, in rail order: a label (deck icon and plural deck name) and the chips in
 * drop order. An empty panel shows a help line. The panel is never dragged or selected.
 * During a drag over the panel, the dragged card's lane shows (added when the panel has
 * none) and ends in a "<Deck> goes here" placeholder; a Modifier over a chip it combines
 * with outlines that chip and names the result above it. Hints are view state from the
 * canvas, never in the store.
 * Chips: a double-click pops the card out, and a press and drag takes it out (the canvas
 * tracks the drag). The resize handle on the right edge changes the width live and saves
 * once, on release. ConceptPanel is the plain body, testable without React Flow.
 * Chips Deal Stack just dealt fade in after their reveal delay (ConceptUi.reveal).
 */
import { useReactFlow, type NodeProps } from '@xyflow/react';
import {
  createContext,
  memo,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ChipView, edgeCues, TYPE_ICON } from '@/features/card';
import {
  CONCEPT_WIDTH,
  DECK_LANE_NAME,
  DECK_NAME,
  DECKS,
  type Board,
  type Card,
  type Deck,
} from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import { Icon, PanelTitle } from '@/shared/ui';
import { conceptLanes } from './concept';
import type { ConceptFlowNode } from './nodes';
import { cardText } from './reading';
import styles from './ConceptNode.module.css';

/** The help line of an empty panel. */
export const CONCEPT_EMPTY_TEXT = 'Drop a card here to add it to the details.';

/** The drag hint over the panel: the lane to show, or the targeted chip and its result. */
export interface ConceptHint {
  lane: Deck | null;
  chipId: string | null;
  result: string | null;
}

/** View state and actions the canvas gives the panel. */
export interface ConceptUi {
  hint: ConceptHint | null;
  /** The chip being dragged out: hidden in its lane. */
  draggingChipId: string | null;
  popOut: (cardId: string) => void;
  startChipDrag: (cardId: string, event: PointerEvent<HTMLElement>) => void;
  resize: (width: number) => void;
  /** Chips Deal Stack just dealt: id → fade-in delay in ms. */
  reveal: ReadonlyMap<string, number>;
}

export const ConceptUiContext = createContext<ConceptUi | null>(null);

/** A lane as the panel draws it: chip ids and their words. */
export interface PanelLane {
  deck: Deck;
  chips: { id: string; text: string; lead: string }[];
}

/**
 * The Modifier words at the front of a combined or On Top chip ("devout exiled "), drawn in
 * the adjective purple so they read as modifiers. A Modifier card's own chip has none.
 */
export function modifierLead(card: Card, text: string): string {
  if (card.type === 'modifier') return '';
  const noun = edgeCues(card)[0]?.noun.text ?? text;
  return text.endsWith(noun) ? text.slice(0, text.length - noun.length) : '';
}

/** The panel's lanes from the board, as plain data. */
export function panelLanes(board: Board): PanelLane[] {
  return conceptLanes(board).map((lane) => ({
    deck: lane.deck,
    chips: lane.cards.map((card) => {
      const text = cardText(board, card);
      return { id: card.id, text, lead: modifierLead(card, text) };
    }),
  }));
}

interface ConceptPanelProps {
  width: number;
  lanes: PanelLane[];
  hint?: ConceptHint | null;
  draggingChipId?: string | null;
  onChipDoubleClick?: (cardId: string) => void;
  onChipPointerDown?: (cardId: string, event: PointerEvent<HTMLElement>) => void;
  /** Chips Deal Stack just dealt: id → fade-in delay in ms. */
  reveal?: ReadonlyMap<string, number>;
  /** The resize handle, drawn by the node. */
  handle?: ReactNode;
}

/** The lanes to draw: the board's, plus an empty lane for the hinted deck when it has none. */
function withHintLane(lanes: PanelLane[], lane: Deck | null): PanelLane[] {
  if (!lane || lanes.some((l) => l.deck === lane)) return lanes;
  const all = [...lanes, { deck: lane, chips: [] }];
  return all.sort((a, b) => DECKS.indexOf(a.deck) - DECKS.indexOf(b.deck));
}

export function ConceptPanel({
  width,
  lanes,
  hint = null,
  draggingChipId = null,
  onChipDoubleClick,
  onChipPointerDown,
  reveal,
  handle,
}: ConceptPanelProps) {
  const shown = withHintLane(lanes, hint?.lane ?? null);
  return (
    <section
      className={styles.panel}
      style={{ width }}
      role="region"
      aria-label="Details"
      data-testid="concept-panel"
    >
      <PanelTitle icon="list" title="Details" />
      {shown.length === 0 && <p className={styles.help}>{CONCEPT_EMPTY_TEXT}</p>}
      {shown.map((lane) => (
        <div key={lane.deck} className={styles.lane} data-lane={lane.deck}>
          <h3 className={styles.laneLabel} style={{ color: `var(--rail-${lane.deck})` }}>
            <Icon name={TYPE_ICON[lane.deck]} size={14} />
            {DECK_LANE_NAME[lane.deck]}
          </h3>
          <ul className={styles.chips} aria-label={DECK_LANE_NAME[lane.deck]}>
            {lane.chips.map((chip) => {
              const targeted = hint?.chipId === chip.id;
              const delay = reveal?.get(chip.id);
              return (
                <li
                  key={chip.id}
                  className={`${styles.chipItem} ${delay === undefined ? '' : styles.dealt} nodrag nopan`}
                  data-dealt={delay === undefined ? undefined : ''}
                  style={
                    delay === undefined
                      ? undefined
                      : ({ '--deal-delay': `${delay}ms` } as CSSProperties)
                  }
                  data-testid="concept-chip"
                  data-card-id={chip.id}
                  onDoubleClick={() => onChipDoubleClick?.(chip.id)}
                  onPointerDown={(event) => onChipPointerDown?.(chip.id, event)}
                >
                  {targeted && hint?.result && (
                    <span className={styles.result} data-testid="chip-result">
                      {hint.result}
                    </span>
                  )}
                  <ChipView
                    text={chip.text}
                    lead={chip.lead}
                    deck={lane.deck}
                    targeted={targeted}
                    hidden={draggingChipId === chip.id}
                  />
                </li>
              );
            })}
            {hint?.lane === lane.deck && (
              <li
                className={styles.slot}
                style={
                  {
                    borderColor: `var(--deck-${lane.deck})`,
                    color: `var(--rail-${lane.deck})`,
                    '--slot-color': `var(--deck-${lane.deck})`,
                  } as CSSProperties
                }
                data-testid="concept-slot"
              >
                {`${DECK_NAME[lane.deck]} goes here`}
              </li>
            )}
          </ul>
        </div>
      ))}
      {handle}
    </section>
  );
}

interface ResizeDrag {
  pointerId: number;
  startX: number;
  width: number;
  zoom: number;
}

const clampWidth = (width: number) =>
  Math.min(CONCEPT_WIDTH.max, Math.max(CONCEPT_WIDTH.min, Math.round(width)));

function ConceptNodeView({ data }: NodeProps<ConceptFlowNode>) {
  const ui = useContext(ConceptUiContext);
  const flow = useReactFlow();
  // A string, so the panel re-renders only when a lane, chip or chip's words change.
  const key = useBoardStore((state) => JSON.stringify(panelLanes(state.board)));
  const lanes = useMemo(() => JSON.parse(key) as PanelLane[], [key]);
  const [live, setLive] = useState<number | null>(null);
  const resize = useRef<ResizeDrag | null>(null);

  function widthAt(event: PointerEvent<HTMLButtonElement>): number {
    const drag = resize.current!;
    return clampWidth(drag.width + (event.clientX - drag.startX) / drag.zoom);
  }

  function onHandleDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    resize.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      width: data.width,
      zoom: flow.getZoom(),
    };
    setLive(data.width);
  }

  function onHandleMove(event: PointerEvent<HTMLButtonElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    setLive(widthAt(event));
  }

  function onHandleUp(event: PointerEvent<HTMLButtonElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    const width = widthAt(event);
    resize.current = null;
    setLive(null);
    ui?.resize(width);
  }

  const handle = (
    <button
      type="button"
      className={`${styles.handle} nodrag nopan`}
      aria-label="Resize Details"
      title="Resize Details"
      data-testid="concept-resize"
      onPointerDown={onHandleDown}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={() => {
        resize.current = null;
        setLive(null);
      }}
    >
      <Icon name="grip" size={10} />
    </button>
  );

  return (
    <ConceptPanel
      width={live ?? data.width}
      lanes={lanes}
      hint={ui?.hint ?? null}
      draggingChipId={ui?.draggingChipId ?? null}
      onChipDoubleClick={ui?.popOut}
      onChipPointerDown={ui?.startChipDrag}
      reveal={ui?.reveal}
      handle={handle}
    />
  );
}

export const ConceptNode = memo(ConceptNodeView);
