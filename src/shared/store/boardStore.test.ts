/**
 * Tests for the board store and newBoard.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { allGenresOn, FORMAT_VERSION, GENRE_DECKS, GENRES } from '@/shared/model';
import { UNDO_LIMIT, useBoardStore } from './boardStore';
import { newBoard } from './newBoard';

const OLD = '2020-01-01T00:00:00.000Z';

beforeEach(() => {
  useBoardStore.getState().openBoard(newBoard({ now: OLD }));
});

describe('boardStore', () => {
  it('changeBoard_recipe_appliesAndStampsUpdatedAt', () => {
    useBoardStore.getState().changeBoard((b) => ({ ...b, name: 'Drift' }));
    const { board } = useBoardStore.getState();
    expect(board.name).toBe('Drift');
    expect(board.updatedAt).not.toBe(OLD);
    expect(board.createdAt).toBe(OLD);
  });

  it('changeBoard_sameObject_noChange', () => {
    const before = useBoardStore.getState().board;
    useBoardStore.getState().changeBoard((b) => b);
    expect(useBoardStore.getState().board).toBe(before);
  });

  it('setView_newView_keepsCardsAndUpdatedAt', () => {
    const before = useBoardStore.getState().board;
    useBoardStore.getState().setView({ panX: 10, panY: -20, zoom: 0.5 });
    const { board } = useBoardStore.getState();
    expect(board.view).toEqual({ panX: 10, panY: -20, zoom: 0.5 });
    expect(board.cards).toBe(before.cards);
    expect(board.updatedAt).toBe(OLD);
  });

  it('openBoard_board_replacesBoard', () => {
    const other = newBoard({ id: 'other' });
    useBoardStore.getState().openBoard(other);
    expect(useBoardStore.getState().board).toBe(other);
  });
});

describe('boardStore undo', () => {
  const store = () => useBoardStore.getState();
  const history = () => useBoardStore.temporal.getState();
  const rename = (name: string) => store().changeBoard((b) => ({ ...b, name }));

  it('undo_afterChange_restoresBoardAndBumpsSaveSeq', () => {
    rename('Drift');
    const seq = store().saveSeq;
    store().undo();
    expect(store().board.name).toBe('Untitled Board');
    expect(store().saveSeq).toBe(seq + 1);
    expect(store().board.updatedAt).not.toBe(OLD);
  });

  it('redo_afterUndo_reappliesChange', () => {
    rename('Drift');
    store().undo();
    store().redo();
    expect(store().board.name).toBe('Drift');
    expect(history().futureStates).toHaveLength(0);
    expect(history().pastStates).toHaveLength(1);
  });

  it('undo_keepsCurrentView', () => {
    rename('Drift');
    store().setView({ panX: 40, panY: 50, zoom: 2 });
    store().undo();
    expect(store().board.name).toBe('Untitled Board');
    expect(store().board.view).toEqual({ panX: 40, panY: 50, zoom: 2 });
  });

  it('setView_notAnUndoStep', () => {
    const seq = store().saveSeq;
    store().setView({ panX: 1, panY: 2, zoom: 1 });
    expect(history().pastStates).toHaveLength(0);
    expect(store().saveSeq).toBe(seq + 1);
  });

  it('openBoard_clearsHistoryAndDoesNotBumpSaveSeq', () => {
    rename('Drift');
    const seq = store().saveSeq;
    store().openBoard(newBoard({ id: 'other' }));
    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
    expect(store().saveSeq).toBe(seq);
  });

  it('openBoard_saveOption_bumpsSaveSeq', () => {
    const seq = store().saveSeq;
    store().openBoard(newBoard({ id: 'other' }), { save: true });
    expect(store().saveSeq).toBe(seq + 1);
    expect(history().pastStates).toHaveLength(0);
  });

  it('changeBoard_101Changes_keeps100Steps', () => {
    for (let i = 0; i <= UNDO_LIMIT; i++) rename(`Name ${i}`);
    expect(history().pastStates).toHaveLength(UNDO_LIMIT);
    for (let i = 0; i < UNDO_LIMIT; i++) store().undo();
    // The oldest step (back to "Untitled Board") dropped off.
    expect(store().board.name).toBe('Name 0');
  });

  it('changeBoard_noChange_noStepNoSave', () => {
    const seq = store().saveSeq;
    store().changeBoard((b) => b);
    expect(history().pastStates).toHaveLength(0);
    expect(store().saveSeq).toBe(seq);
  });

  it('undo_emptyHistory_noOp', () => {
    const before = store().board;
    const seq = store().saveSeq;
    store().undo();
    store().redo();
    expect(store().board).toBe(before);
    expect(store().saveSeq).toBe(seq);
  });
});

describe('boardStore genres', () => {
  const store = () => useBoardStore.getState();
  const history = () => useBoardStore.temporal.getState();
  const narrowed = () => ({ ...allGenresOn(), mechanic: ['puzzle' as const] });

  it('setGenres_newGenres_savesAndStampsWithoutUndoStep', () => {
    const seq = store().saveSeq;
    const genres = narrowed();
    store().setGenres(genres);
    expect(store().board.genres).toBe(genres);
    expect(store().saveSeq).toBe(seq + 1);
    expect(store().board.updatedAt).not.toBe(OLD);
    expect(history().pastStates).toHaveLength(0);
  });

  it('setGenres_sameObject_noChange', () => {
    const before = store().board;
    const seq = store().saveSeq;
    store().setGenres(before.genres);
    expect(store().board).toBe(before);
    expect(store().saveSeq).toBe(seq);
  });

  it('undo_afterGenreChange_keepsCurrentGenres', () => {
    store().changeBoard((b) => ({ ...b, name: 'Drift' }));
    const genres = narrowed();
    store().setGenres(genres);
    const seq = store().saveSeq;
    store().undo();
    expect(store().board.name).toBe('Untitled Board');
    expect(store().board.genres).toBe(genres);
    expect(store().saveSeq).toBe(seq + 1);
  });

  it('redo_afterGenreChange_keepsCurrentGenres', () => {
    store().changeBoard((b) => ({ ...b, name: 'Drift' }));
    store().undo();
    const genres = narrowed();
    store().setGenres(genres);
    store().redo();
    expect(store().board.name).toBe('Drift');
    expect(store().board.genres).toBe(genres);
  });
});

describe('newBoard', () => {
  it('newBoard_defaults_emptyBoardAtFormatVersion', () => {
    const board = newBoard({ id: 'b1', now: OLD });
    expect(board).toEqual({
      formatVersion: FORMAT_VERSION,
      id: 'b1',
      name: 'Untitled Board',
      createdAt: OLD,
      updatedAt: OLD,
      genres: allGenresOn(),
      view: { panX: 0, panY: 0, zoom: 1 },
      cards: [],
      notes: [],
    });
  });

  it('newBoard_noOptions_untitledBoardWithAll21GenresInEachGenreDeck', () => {
    const board = newBoard();
    expect(board.name).toBe('Untitled Board');
    expect(Object.keys(board.genres).sort()).toEqual([...GENRE_DECKS].sort());
    for (const deck of GENRE_DECKS) expect(board.genres[deck]).toEqual([...GENRES]);
  });

  it('newBoard_name_keepsIt', () => {
    expect(newBoard({ name: 'Salvage Run' }).name).toBe('Salvage Run');
  });
});
