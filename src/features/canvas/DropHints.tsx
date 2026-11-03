/**
 * DropHints: the drag hints (design 9.4 and 9.5), drawn in flow coordinates inside the
 * React Flow viewport so they pan and zoom with the cards, and above every card.
 * combine: an outline around the whole target and "Drop To Combine". swapZones: the
 * "Swap" circle and the "Add On Top" band, the zone under the pointer at full strength.
 * slot: the "… Goes Here" band under the target's bottom edge.
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
  motivation: 'Motivation Goes Here',
  conflict: 'Conflict Goes Here',
};

export function DropHints({ hint }: { hint: DragHint | null }) {
  if (!hint) return null;
  const { target } = hint;
  const at = { left: target.x, top: target.y };

  let content;
  if (hint.hint === 'combine') {
    content = (
      <div className={styles.combine} style={at} data-testid="hint-combine">
        <span className={styles.pill}>Drop To Combine</span>
      </div>
    );
  } else if (hint.hint === 'swapZones') {
    content = (
      <div className={styles.zones} style={at} data-testid="hint-zones">
        <div
          className={`${styles.zone} ${styles.circle} ${hint.zone === 'swap' ? styles.active : ''}`}
          data-active={hint.zone === 'swap'}
        >
          Swap
        </div>
        <div
          className={`${styles.zone} ${styles.band} ${hint.zone === 'top' ? styles.active : ''}`}
          data-active={hint.zone === 'top'}
        >
          Add On Top
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
