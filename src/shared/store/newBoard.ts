/**
 * newBoard: builds an empty board at the current format version. The New Board dialog
 * passes the name and deck genres; tests and other callers get "Untitled Board" and all 4
 * genres in every deck.
 */
import {
  CARD_TYPES,
  everyDeck,
  FORMAT_VERSION,
  GENRES,
  newId,
  type Board,
  type DeckGenres,
} from '@/shared/model';

export const NEW_BOARD_NAME = 'Untitled Board';

/** An empty board, unpanned at zoom 1, with the given name and deck genres (defaults above). */
export function newBoard(
  options: { id?: string; now?: string; name?: string; genres?: DeckGenres } = {},
): Board {
  const now = options.now ?? new Date().toISOString();
  const g = options.genres;
  return {
    formatVersion: FORMAT_VERSION,
    id: options.id ?? newId(),
    name: options.name ?? NEW_BOARD_NAME,
    createdAt: now,
    updatedAt: now,
    // Copy each list, so the board never shares arrays with the caller.
    genres: g
      ? (Object.fromEntries(CARD_TYPES.map((t) => [t, [...g[t]]])) as DeckGenres)
      : everyDeck(GENRES),
    view: { panX: 0, panY: 0, zoom: 1 },
    cards: [],
    notes: [],
  };
}
