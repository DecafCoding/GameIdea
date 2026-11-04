/**
 * newBoard: builds an empty board at the current format version, with all 21 genres on in
 * every genre-tagged deck. The New Board dialog passes the name; tests and other callers
 * get "Untitled Board".
 */
import { allGenresOn, FORMAT_VERSION, newId, type Board } from '@/shared/model';

export const NEW_BOARD_NAME = 'Untitled Board';

/** An empty board, unpanned at zoom 1, with the given name (default above). */
export function newBoard(options: { id?: string; now?: string; name?: string } = {}): Board {
  const now = options.now ?? new Date().toISOString();
  return {
    formatVersion: FORMAT_VERSION,
    id: options.id ?? newId(),
    name: options.name ?? NEW_BOARD_NAME,
    kind: 'free',
    createdAt: now,
    updatedAt: now,
    genres: allGenresOn(),
    view: { panX: 0, panY: 0, zoom: 1 },
    cards: [],
    notes: [],
  };
}
