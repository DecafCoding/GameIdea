/**
 * CountBadge: bottom left of the canvas, "N cards · N notes" (design section 8). Counts
 * tucked cards too. aria-live, so screen readers hear the count change.
 */
import { useBoardStore } from '@/shared/store';
import styles from './CountBadge.module.css';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** "4 cards · 1 note" */
export function countText(cards: number, notes: number): string {
  return `${plural(cards, 'card')} · ${plural(notes, 'note')}`;
}

export function CountBadge() {
  const cards = useBoardStore((state) => state.board.cards.length);
  const notes = useBoardStore((state) => state.board.notes.length);
  return (
    <div className={styles.badge} aria-live="polite" data-testid="count-badge">
      {countText(cards, notes)}
    </div>
  );
}
