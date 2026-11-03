/**
 * Board list row summary (design 9.8): card and note counts, the type strip and the
 * "N cards · N notes · edited <when>" caption with a relative time.
 */
import type { Board, CardType } from '@/shared/model';

export interface BoardSummary {
  id: string;
  name: string;
  updatedAt: string;
  cardCount: number;
  noteCount: number;
  /** Each card's type in board order; tucked cards count. */
  typeStrip: CardType[];
}

export function summarize(board: Board): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    updatedAt: board.updatedAt,
    cardCount: board.cards.length,
    noteCount: board.notes.length,
    typeStrip: board.cards.map((card) => card.type),
  };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "just now", "N minutes ago", "N hours ago", "yesterday", "N days ago", then a short date. */
export function editedAgo(updatedAt: string, now: Date): string {
  const then = new Date(updatedAt);
  const elapsed = Math.max(0, now.getTime() - then.getTime());
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${plural(Math.floor(elapsed / MINUTE), 'minute')} ago`;
  if (elapsed < DAY) return `${plural(Math.floor(elapsed / HOUR), 'hour')} ago`;
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  if (days <= 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** "5 cards · 1 note · edited 2 hours ago"; a just-imported row says "imported". */
export function rowCaption(
  summary: BoardSummary,
  now: Date,
  verb: 'edited' | 'imported' = 'edited',
): string {
  return `${plural(summary.cardCount, 'card')} · ${plural(summary.noteCount, 'note')} · ${verb} ${editedAgo(summary.updatedAt, now)}`;
}
