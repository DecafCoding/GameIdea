/**
 * DropHints: the drag hints (design 9.7 and 9.8), drawn in flow coordinates inside the
 * React Flow viewport so they pan and zoom with the cards, and above every card.
 * combine: the whole card is the zone, "Drop to combine". swapZones: the "Add on top" top
 * band and the "Swap" circle, the zone under the pointer at full strength. swapOnly: the
 * card already has an On Top Modifier, so only "Swap" shows. slot: the "… goes here" band
 * under the target's bottom edge.
 * The zone labels follow the phase plan's sentence case, as hint text.
 */
import { ViewportPortal } from '@xyflow/react';
import type { Card, CardType } from '@/shared/model';
import type { DropHint } from './dropZones';
import styles from './DropHints.module.css';

export interface DragHint {
  target: Card;
  hint: Exclude<DropHint, null>;
  /** On a combined target, the zone the pointer is in. */
  zone: 'swap' | 'top' | null;
  draggedType: CardType;
}

const SLOT_LABEL: Partial<Record<CardType, string>> = {
  goal: 'Goal Goes Here',
  conflict: 'Conflict Goes Here',
};

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
    content = (
      <div className={styles.slot} style={at} data-testid="hint-slot">
        {SLOT_LABEL[hint.draggedType]}
      </div>
    );
  }
  return <ViewportPortal>{content}</ViewportPortal>;
}
