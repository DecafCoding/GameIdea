/**
 * Board card summary (design 9.3): the board kind, card and note counts, the Hook Cards and their
 * sentences, the first hook for the preview, the deck dots, and the meta line
 * "Edited 10 minutes ago · 8 cards · 1 hook" with a relative time.
 */
import { hookSentences } from '@/features/canvas';
import { CARD_TYPES, type Board, type BoardKind, type CardType } from '@/shared/model';

export interface BoardSummary {
  id: string;
  name: string;
  /** Free Form or One-Pager: a One-Pager board shows its label on the board list. */
  kind: BoardKind;
  updatedAt: string;
  cardCount: number;
  noteCount: number;
  /** Hook Cards on the board, empty or not. */
  hookCardCount: number;
  /** Each non-empty hook sentence, in reading order. */
  hooks: string[];
  /** The first hook sentence, or null when there is none. */
  firstHook: string | null;
  /** The distinct card types on the board: Hook Card first, then deck order. */
  deckTypes: CardType[];
}

export function summarize(board: Board): BoardSummary {
  const hooks = hookSentences(board);
  const types = new Set(board.cards.map((card) => card.type));
  return {
    id: board.id,
    name: board.name,
    kind: board.kind,
    updatedAt: board.updatedAt,
    cardCount: board.cards.length,
    noteCount: board.notes.length,
    hookCardCount: board.cards.filter((card) => card.type === 'hook').length,
    hooks,
    firstHook: hooks[0] ?? null,
    deckTypes: CARD_TYPES.filter((type) => types.has(type)),
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

/**
 * "Edited 10 minutes ago · 8 cards · 1 hook": the hook count counts non-empty sentences
 * and reads "no hook yet" at 0. A just-imported board says "Imported".
 */
export function metaLine(
  summary: BoardSummary,
  now: Date,
  verb: 'Edited' | 'Imported' = 'Edited',
): string {
  const hooks = summary.hooks.length === 0 ? 'no hook yet' : plural(summary.hooks.length, 'hook');
  return `${verb} ${editedAgo(summary.updatedAt, now)} · ${plural(summary.cardCount, 'card')} · ${hooks}`;
}
