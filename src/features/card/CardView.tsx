/**
 * CardView: one 250 px story card (design section 9.2) with its ring control.
 * Layers, bottom to top: the cue face, the rings, the type disc. The card body and
 * the disc never turn. A 1-ring card rotates its whole cue layer on a turn; a combined
 * card keeps each "adjective noun" edge centered and fades in the turned words.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { DECK_NAME, type Card, type Cue } from '@/shared/model';
import { Icon } from '@/shared/ui';
import { RingControl } from './RingControl';
import { edgeCues, isCombined, type RingSlot, type TurnDirection } from './rings';
import { KIND_ICON, TYPE_ICON, TypeDisc } from './TypeDisc';
import { useTurnAngle, type TurnState } from './useTurnAngle';
import styles from './CardView.module.css';

/** The paper step (design 9.4): the top card, then each tucked depth. */
export type CardPaper = 'top' | 'under-1' | 'under-2';

interface CardViewProps {
  card: Card;
  onTurn: (slot: RingSlot, direction: TurnDirection) => void;
  /** Extra class names on the ring-half buttons (the canvas passes its no-drag class). */
  ringClassName?: string;
  /** Tucked cards use the next paper step and the under shadow. Defaults to 'top'. */
  paper?: CardPaper;
}

const PAPER_CLASS: Record<CardPaper, string | undefined> = {
  top: undefined,
  'under-1': styles.under1,
  'under-2': styles.under2,
};

/**
 * Distance from the card center to the outer side of every label: the 14 px inset on the
 * 250 px card, 125 - 14 = 111. The label grows inward, so a wrapped label keeps its outer
 * line on the inset. The label sizes that keep edges apart are in CardView.module.css.
 */
const EDGE_OUTSIDE = 111;

function slotTransform(slot: number, count: number): string {
  // translateY's 50 percent is half the label's own height, so its outer side lands on the inset.
  return `translate(-50%, -50%) rotate(${(slot * 360) / count}deg) translateY(calc(${EDGE_OUTSIDE}px - 50%))`;
}

/**
 * The label box for an edge. Player Role, Setting, Goal and Conflict share one frame:
 * 2 wide lines on the top and bottom edges, 3 narrow lines on the sides. Modifier stays
 * on one line. Edge 0 is the bottom; on a 4-cue card the odd edges are the sides.
 */
function labelFit(type: Card['type'], count: number, edge: number): string {
  if (type === 'modifier') return '';
  return (count === 4 && edge % 2 === 1 ? styles.side : styles.wide) ?? '';
}

interface CueLabelProps {
  edge: number;
  slot: number;
  count: number;
  noun: Cue;
  adjective?: Cue;
  /** The label box class from labelFit. */
  fit: string;
  /** Hides the label but keeps its place: side edges of a tucked card. */
  hidden?: boolean;
  wordKeys?: { noun: string; adjective: string };
  slideFrom?: { noun: string; adjective: string };
}

function CueLabel({
  edge,
  slot,
  count,
  noun,
  adjective,
  fit,
  hidden,
  wordKeys,
  slideFrom,
}: CueLabelProps) {
  const active = edge === 0;
  const full = adjective ? `${adjective.text} ${noun.text}` : noun.text;
  const classes = [styles.label, fit, active ? styles.active : '', hidden ? styles.tuckedSide : '']
    .filter(Boolean)
    .join(' ');

  let words: ReactNode = noun.text;
  if (adjective) {
    words = (
      <>
        <span
          key={wordKeys?.adjective}
          className={`${styles.adj} ${wordKeys ? styles.turnIn : ''}`}
          style={{ '--slide-from': slideFrom?.adjective } as CSSProperties}
        >
          {adjective.text}
        </span>{' '}
        <span
          key={wordKeys?.noun}
          className={wordKeys ? styles.turnIn : ''}
          style={{ '--slide-from': slideFrom?.noun } as CSSProperties}
        >
          {noun.text}
        </span>
      </>
    );
  }

  return (
    <div
      className={classes}
      style={{ transform: slotTransform(slot, count) }}
      title={full}
      data-edge={edge}
      data-kind={noun.kind}
      data-testid={active ? 'active-cue' : 'cue'}
    >
      {words}
    </div>
  );
}

/** A clockwise turn moves words toward local -x, so they slide in from +4 px. */
const slide = (turn: TurnState) => (turn.direction === 'cw' ? '4px' : '-4px');

export function CardView({ card, onTurn, ringClassName, paper = 'top' }: CardViewProps) {
  const [lastDirection, setLastDirection] = useState<TurnDirection>('cw');
  const nouns = card.rings[0];
  const count = nouns?.cues.length ?? 0;
  const combined = isCombined(card);
  // A Setting card's disc shows the kind (place, object, event) of the cue on the bottom edge.
  const activeKind = nouns?.cues[nouns.activeIndex]?.kind;
  const outerTurn = useTurnAngle(nouns?.activeIndex ?? 0, count, lastDirection);
  const innerTurn = useTurnAngle(card.rings[1]?.activeIndex ?? 0, 4, lastDirection);
  const tucked = paper !== 'top';
  /** Box class and tucked hiding for the label on an edge. */
  const edgeProps = (edge: number) => ({
    fit: labelFit(card.type, count, edge),
    hidden: tucked && count === 4 && edge % 2 === 1,
  });

  function turn(slot: RingSlot, direction: TurnDirection) {
    setLastDirection(direction);
    onTurn(slot, direction);
  }

  let face: ReactNode;
  if (!nouns) {
    face = null;
  } else if (combined) {
    // Static composed edges; only the turned group's words remount and fade in.
    const wordKeys = { noun: `n${outerTurn.turns}`, adjective: `a${innerTurn.turns}` };
    const slideFrom = { noun: slide(outerTurn), adjective: slide(innerTurn) };
    face = (
      <div className={styles.cueLayer}>
        {edgeCues(card).map(({ edge, noun, adjective }) => (
          <CueLabel
            key={edge}
            edge={edge}
            slot={edge}
            count={count}
            noun={noun}
            adjective={adjective}
            {...edgeProps(edge)}
            wordKeys={wordKeys}
            slideFrom={slideFrom}
          />
        ))}
      </div>
    );
  } else {
    // Cue i sits in slot i; rotating the layer brings the active cue to the bottom.
    face = (
      <div
        className={`${styles.cueLayer} ${styles.turning} ${count === 2 ? styles.halfTurn : ''}`}
        style={{ transform: `rotate(${outerTurn.angle}deg)` }}
      >
        {nouns.cues.map((cue, i) => {
          const edge = (i - nouns.activeIndex + count) % count;
          return (
            <CueLabel key={i} edge={edge} slot={i} count={count} noun={cue} {...edgeProps(edge)} />
          );
        })}
      </div>
    );
  }

  return (
    <article
      className={[styles.card, PAPER_CLASS[paper]].filter(Boolean).join(' ')}
      data-card=""
      data-paper={paper}
      data-testid="card"
      data-type={card.type}
      data-combined={combined}
      aria-label={`${DECK_NAME[card.type]} Card`}
    >
      <div className={styles.face}>
        {face}
        {count === 2 && <div className={styles.rule} data-testid="middle-rule" />}
      </div>
      <RingControl card={card} onTurn={turn} buttonClassName={ringClassName} />
      <span
        className={[styles.disc, combined ? styles.combinedDisc : ''].filter(Boolean).join(' ')}
        data-testid={combined ? 'combined-disc' : undefined}
      >
        <TypeDisc type={card.type} size={48} icon={activeKind && KIND_ICON[activeKind]} />
      </span>
      {paper !== 'top' && (
        // A tucked card shows only its bottom edge, so the disc glyph repeats there, small.
        <span className={styles.tuckMark} data-testid="tuck-mark">
          <Icon name={(activeKind && KIND_ICON[activeKind]) ?? TYPE_ICON[card.type]} size={14} />
        </span>
      )}
    </article>
  );
}
