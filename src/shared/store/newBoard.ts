/**
 * newBoard: builds a new board at the current format version, with all 21 genres on in
 * every genre-tagged deck. The New Board dialog passes the name and the kind; tests and
 * other callers get "Untitled Board", Free Form. A Free Form board starts empty and has no
 * conceptWidth key. A One-Pager board starts with its 1 Hook Card at ONE_PAGER_HOOK_SPOT
 * and the default Concept width (docs/feature-one-pager-board.html).
 */
import {
  allGenresOn,
  CONCEPT_WIDTH,
  FORMAT_VERSION,
  newId,
  type Board,
  type BoardKind,
  type Card,
} from '@/shared/model';

export const NEW_BOARD_NAME = 'Untitled Board';

/** Where a new One-Pager board's Hook Card sits: on the 24 px grid, in view at zoom 1. */
export const ONE_PAGER_HOOK_SPOT = { x: 96, y: 96 } as const;

/** A new board, unpanned at zoom 1, with the given name (default above) and kind. */
export function newBoard(
  options: { id?: string; now?: string; name?: string; kind?: BoardKind; hookId?: string } = {},
): Board {
  const now = options.now ?? new Date().toISOString();
  const board: Board = {
    formatVersion: FORMAT_VERSION,
    id: options.id ?? newId(),
    name: options.name ?? NEW_BOARD_NAME,
    kind: options.kind ?? 'free',
    createdAt: now,
    updatedAt: now,
    genres: allGenresOn(),
    view: { panX: 0, panY: 0, zoom: 1 },
    cards: [],
    notes: [],
  };
  if (board.kind !== 'onePager') return board;
  const hook: Card = {
    id: options.hookId ?? newId(),
    type: 'hook',
    x: ONE_PAGER_HOOK_SPOT.x,
    y: ONE_PAGER_HOOK_SPOT.y,
    z: 1,
    tuckedUnder: null,
    rings: [],
    onTopOf: null,
    locked: false,
    inConcept: false,
  };
  return { ...board, conceptWidth: CONCEPT_WIDTH.default, cards: [hook] };
}
