/**
 * RingControl: the rotation control (design F, section 9.3). Each ring is 2 real buttons
 * clipped to a half annulus, so the whole half is the hit target. The left half turns
 * its cue group counter-clockwise, the right half clockwise. The layer shows on
 * pointer-over and on keyboard focus.
 */
import type { CSSProperties } from 'react';
import type { Card } from '@/shared/model';
import {
  ARROW_X,
  CARD_SIZE,
  INNER_RADIUS,
  OUTER_RADIUS,
  arrowPath,
  ringHalfPath,
  type RingSide,
} from './ringGeometry';
import { isCombined, ringWord, type RingSlot, type TurnDirection } from './rings';
import styles from './RingControl.module.css';

interface RingControlProps {
  card: Card;
  onTurn: (slot: RingSlot, direction: TurnDirection) => void;
  /** Extra class names on each ring-half button. */
  buttonClassName?: string;
}

interface RingSpec {
  slot: RingSlot;
  ringIndex: number;
  position: 'inner' | 'outer';
  colorType: Card['type'];
}

/** A 1-ring card draws its ring at the inner position; a combined card draws both. */
function ringsFor(card: Card): RingSpec[] {
  if (!isCombined(card)) {
    return [{ slot: 'outer', ringIndex: 0, position: 'inner', colorType: card.type }];
  }
  return [
    { slot: 'outer', ringIndex: 0, position: 'outer', colorType: card.type },
    { slot: 'inner', ringIndex: 1, position: 'inner', colorType: 'description' },
  ];
}

const SIDES: { side: RingSide; direction: TurnDirection; label: string }[] = [
  { side: 'left', direction: 'ccw', label: 'Left' },
  { side: 'right', direction: 'cw', label: 'Right' },
];

export function RingControl({ card, onTurn, buttonClassName }: RingControlProps) {
  return (
    <div className={styles.layer} data-testid="ring-layer">
      {ringsFor(card).map((ring) => {
        const radius = ring.position === 'inner' ? INNER_RADIUS : OUTER_RADIUS;
        const colors = {
          '--ring-color': `var(--type-${ring.colorType})`,
          '--ring-dark': `var(--type-${ring.colorType}-dark)`,
        } as CSSProperties;
        return SIDES.map(({ side, direction, label }) => {
          const path = ringHalfPath(radius, side);
          const arrowX = ARROW_X[ring.position][side === 'left' ? 0 : 1];
          return (
            <button
              key={`${ring.slot}-${side}`}
              type="button"
              className={buttonClassName ? `${styles.half} ${buttonClassName}` : styles.half}
              style={{ ...colors, clipPath: `path('${path}')` }}
              aria-label={`Turn ${ringWord(card, ring.ringIndex)} ${label}`}
              data-ring={ring.slot}
              data-side={side}
              onClick={() => onTurn(ring.slot, direction)}
            >
              <svg
                className={styles.marks}
                width={CARD_SIZE}
                height={CARD_SIZE}
                viewBox={`0 0 ${CARD_SIZE} ${CARD_SIZE}`}
                aria-hidden="true"
              >
                <path className={styles.focus} d={path} />
                <path className={styles.arrow} d={arrowPath(arrowX)} />
              </svg>
            </button>
          );
        });
      })}
    </div>
  );
}
