/**
 * CountBadge: bottom left of the canvas, "N cards · N notes" (design section 8). Counts
 * tucked cards too. On a One-Pager board it reads "12 cards · 1 hook · 1 details" (design
 * 9.15): the Hook Train plus the Details cards, not the Hook Card, loose cards or notes.
 * aria-live, so screen readers hear the count change.
 */
import { useBoardStore } from '@/shared/store';
import { onePagerCardCount } from './concept';
import styles from './CountBadge.module.css';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "4 cards · 1 note" */
export function countText(cards: number, notes: number): string {
  return `${plural(cards, 'card')} · ${plural(notes, 'note')}`;
}

/** "12 cards · 1 hook · 1 details" */
export function onePagerCountText(cards: number): string {
  return `${plural(cards, 'card')} · 1 hook · 1 details`;
}

export function CountBadge() {
  const text = useBoardStore((state) =>
    state.board.kind === 'onePager'
      ? onePagerCountText(onePagerCardCount(state.board))
      : countText(state.board.cards.length, state.board.notes.length),
  );
  return (
    <div className={styles.badge} aria-live="polite" data-testid="count-badge">
      {text}
    </div>
  );
}
