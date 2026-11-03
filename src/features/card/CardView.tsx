/**
 * CardView: one 200 px game concept card (design section 9.4) with its ring control.
 * Layers, bottom to top: the cue face, the rings, the type disc. The card body and
 * the disc never turn. A 1-ring card rotates its whole cue layer on a turn; a combined
 * card keeps each "adjective noun" edge centered and fades in the turned words.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { DECK_NAME, MOD_DECK_NAME, type Card, type Cue, type Ring } from '@/shared/model';
import { Icon } from '@/shared/ui';
import { RingControl } from './RingControl';
import { edgeCues, isCombined, type EdgeCue, type RingSlot, type TurnDirection } from './rings';
import { iconFor, TypeDisc } from './TypeDisc';
import { useTurnAngle, type TurnState } from './useTurnAngle';
import styles from './CardView.module.css';

/** The paper step (design 9.7): the top card, then each tucked depth, darker per level. */
export type CardPaper = 'top' | 'under-1' | 'under-2' | 'under-3' | 'under-4';

interface CardViewProps {
  card: Card;
  onTurn: (slot: RingSlot, direction: TurnDirection) => void;
  /** Extra class names on the ring-half buttons (the canvas passes its no-drag class). */
  ringClassName?: string;
  /** Tucked cards use the next paper step and the under shadow. Defaults to 'top'. */
  paper?: CardPaper;
  /** The ring of the Modifier on top of this card: its adjective reads first on each edge. */
  onTop?: Ring;
}

const PAPER_CLASS: Record<CardPaper, string | undefined> = {
  top: undefined,
  'under-1': styles.under1,
  'under-2': styles.under2,
  'under-3': styles.under3,
  'under-4': styles.under4,
};

/**
 * Distance from the card center to the outer side of every label: the 14 px inset on the
 * 200 px card, 100 - 14 = 86. The label grows inward, so a wrapped label keeps its outer
 * line on the inset. The label sizes that keep edges apart are in CardView.module.css.
 */
const EDGE_OUTSIDE = 86;

function slotTransform(slot: number, count: number): string {
  // translateY's 50 percent is half the label's own height, so its outer side lands on the inset.
  return `translate(-50%, -50%) rotate(${(slot * 360) / count}deg) translateY(calc(${EDGE_OUTSIDE}px - 50%))`;
}

/**
 * The label box for an edge. Modifier and Mood (1-word decks) stay on one line. Player
 * Role, Mechanic, Resource and Setting use the 4-cue frame: 2 lines on every edge. Goal,
 * Conflict, Twist, Progression and Constraint use the 2-cue frame: 2 wide lines.
 * Edge 0 is the bottom; on a 4-cue card the odd edges are the sides.
 */
function labelFit(type: Card['type'], count: number, edge: number): string {
  if (type === 'modifier' || type === 'mood') return '';
  if (count === 2) return styles.wide ?? '';
  return [edge % 2 === 1 ? styles.side : styles.wide, styles.four].join(' ');
}

interface CueLabelProps {
  edge: number;
  slot: number;
  count: number;
  noun: Cue;
  adjective?: Cue;
  onTopAdjective?: Cue;
  /** The label box class from labelFit. */
  fit: string;
  /** Hides the label but keeps its place: side edges of a tucked card. */
  hidden?: boolean;
  /** The bottom label of a tucked card: narrower, clear of the strip's marks. */
  narrow?: boolean;
  wordKeys?: { noun: string; adjective: string };
  slideFrom?: { noun: string; adjective: string };
}

function CueLabel({
  edge,
  slot,
  count,
  noun,
  adjective,
  onTopAdjective,
  fit,
  hidden,
  narrow,
  wordKeys,
  slideFrom,
}: CueLabelProps) {
  const active = edge === 0;
  const full = [onTopAdjective, adjective, noun]
    .filter((cue): cue is Cue => cue !== undefined)
    .map((cue) => cue.text)
    .join(' ');
  const classes = [
    styles.label,
    fit,
    active ? styles.active : '',
    hidden ? styles.tuckedSide : '',
    narrow ? styles.tuckedBottom : '',
  ]
    .filter(Boolean)
    .join(' ');

  let words: ReactNode = noun.text;
  if (adjective || onTopAdjective) {
    words = (
      <>
        {onTopAdjective && (
          <>
            <span className={styles.adj} data-testid="on-top-adjective">
              {onTopAdjective.text}
            </span>{' '}
          </>
        )}
        {adjective && (
          <>
            <span
              key={wordKeys?.adjective}
              className={`${styles.adj} ${wordKeys ? styles.turnIn : ''}`}
              style={{ '--slide-from': slideFrom?.adjective } as CSSProperties}
            >
              {adjective.text}
            </span>{' '}
          </>
        )}
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
      data-testid={active ? 'active-cue' : 'cue'}
    >
      {words}
    </div>
  );
}

/** The card's name for screen readers: "Resource Modifier Card", "Mechanic Card". */
function cardLabel(card: Card): string {
  const name =
    card.type === 'modifier' ? MOD_DECK_NAME[card.modDeck ?? 'role'] : DECK_NAME[card.type];
  return `${name} Card`;
}

/** A clockwise turn moves words toward local -x, so they slide in from +4 px. */
const slide = (turn: TurnState) => (turn.direction === 'cw' ? '4px' : '-4px');

export function CardView({ card, onTurn, ringClassName, paper = 'top', onTop }: CardViewProps) {
  const [lastDirection, setLastDirection] = useState<TurnDirection>('cw');
  const nouns = card.rings[0];
  const count = nouns?.cues.length ?? 0;
  const combined = isCombined(card);
  const outerTurn = useTurnAngle(nouns?.activeIndex ?? 0, count, lastDirection);
  const innerTurn = useTurnAngle(card.rings[1]?.activeIndex ?? 0, 4, lastDirection);
  const tucked = paper !== 'top';
  /** Box class and tucked hiding for the label on an edge. */
  const edgeProps = (edge: number) => ({
    fit: labelFit(card.type, count, edge),
    hidden: tucked && count === 4 && edge % 2 === 1,
    narrow: tucked && edge === 0,
  });

  function turn(slot: RingSlot, direction: TurnDirection) {
    setLastDirection(direction);
    onTurn(slot, direction);
  }

  let face: ReactNode;
  if (!nouns) {
    face = null;
  } else if (combined || onTop) {
    // Static composed edges; only the turned group's words remount and fade in.
    const wordKeys = { noun: `n${outerTurn.turns}`, adjective: `a${innerTurn.turns}` };
    const slideFrom = { noun: slide(outerTurn), adjective: slide(innerTurn) };
    face = (
      <div className={styles.cueLayer}>
        {edgeCues(card, onTop).map(({ edge, noun, adjective, onTopAdjective }: EdgeCue) => (
          <CueLabel
            key={edge}
            edge={edge}
            slot={edge}
            count={count}
            noun={noun}
            adjective={adjective}
            onTopAdjective={onTopAdjective}
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
      data-mod-deck={card.type === 'modifier' ? card.modDeck : undefined}
      aria-label={cardLabel(card)}
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
        <TypeDisc type={card.type} size={48} icon={iconFor(card)} />
      </span>
      {paper !== 'top' && (
        // A tucked card shows only its bottom edge, so the disc glyph repeats there, small.
        <span className={styles.tuckMark} data-testid="tuck-mark">
          <Icon name={iconFor(card)} size={14} />
        </span>
      )}
      {card.locked && (
        // An indicator only: lock and unlock go through the card strip (44 px targets).
        <span
          className={tucked ? styles.lockTucked : styles.lockMark}
          data-testid="lock-mark"
          aria-label="Locked"
          role="img"
        >
          <Icon name="lock" size={tucked ? 13 : 15} />
        </span>
      )}
    </article>
  );
}
