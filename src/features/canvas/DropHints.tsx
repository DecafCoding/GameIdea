/**
 * DropHints: the drag hints (design 9.7 and 9.8), drawn in flow coordinates inside the
 * React Flow viewport so they pan and zoom with the cards, and above every card.
 * combine: the whole card is the zone, "Drop to combine". swapZones: the "Add on top" top
 * band and the "Swap" circle, the zone under the pointer at full strength. swapOnly: the
 * card already has an On Top Modifier, so only "Swap" shows. slot: the "… goes here" band
 * where the tucked card will land: its visible bottom band, 16 taller at the top.
 * The zone labels follow the phase plan's sentence case, as hint text.
 */
import { ViewportPortal } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { DECK_NAME, type Card, type CardType } from '@/shared/model';
import type { DropHint } from './dropZones';
import { CARD_SIZE, type Point } from './placement';
import { TUCK_OFFSET } from './stack';
import styles from './DropHints.module.css';

export interface DragHint {
  target: Card;
  hint: Exclude<DropHint, null>;
  /** On a combined target, the zone the pointer is in. */
  zone: 'swap' | 'top' | null;
  draggedType: CardType;
  /** For a slot: the dragged card's top-left after the tuck (tuckLanding). */
  landing: Point | null;
}

/** The slot starts this far above the visible band of the landing card (design 9.7). */
const SLOT_OVERLAP = 16;

export function DropHints({ hint }: { hint: DragHint | null }) {
  if (!hint) return null;
  const { target } = hint;
  const at = { left: target.x, top: target.y };

  let content;
  if (hint.hint === 'combine') {
    content = (
      <div className={`${styles.combine} ${styles.zone}`} style={at} data-testid="hint-combine">
        Drop to combine
      </div>
    );
  } else if (hint.hint === 'swapZones' || hint.hint === 'swapOnly') {
    content = (
      <div className={styles.zones} style={at} data-testid="hint-zones">
        {hint.hint === 'swapZones' && (
          <div
            className={`${styles.zone} ${styles.band} ${hint.zone === 'top' ? styles.active : ''}`}
            data-active={hint.zone === 'top'}
            data-testid="zone-top"
          >
            Add on top
          </div>
        )}
        <div
          className={`${styles.zone} ${styles.circle} ${hint.zone === 'swap' ? styles.active : ''}`}
          data-active={hint.zone === 'swap'}
          data-testid="zone-swap"
        >
          Swap
        </div>
      </div>
    );
  } else {
    // The slot (design 9.7): 200 × 72 over where the dragged card will land: its visible
    // 56 px bottom band (the card before it covers the rest) and 16 above it. At the normal
    // place this starts 16 above the target's bottom edge.
    const deck = hint.draggedType;
    const landing = hint.landing ?? { x: target.x, y: target.y + TUCK_OFFSET };
    const slot = {
      left: landing.x,
      top: landing.y + CARD_SIZE - TUCK_OFFSET - SLOT_OVERLAP,
      borderColor: `var(--deck-${deck})`,
      color: `var(--rail-${deck})`,
      '--slot-color': `var(--deck-${deck})`,
    } as CSSProperties;
    content = (
      <div className={styles.slot} style={slot} data-testid="hint-slot">
        {`${DECK_NAME[deck]} goes here`}
      </div>
    );
  }
  return <ViewportPortal>{content}</ViewportPortal>;
}
