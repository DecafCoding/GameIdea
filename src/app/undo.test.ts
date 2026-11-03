/**
 * Undo and redo reverse each action type: every board action, driven through the real
 * feature recipes and the board store, is one undo step that undo reverses and redo
 * re-applies.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  combineOnto,
  discardCard,
  dropCard,
  placeNewCard,
  redrawCard,
  splitCard,
  swapOnto,
  turnCardOnBoard,
} from '@/features/canvas';
import { addNote, deleteNote, moveNote, resizeNote, setNoteContent } from '@/features/notes';
import type { Board } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  secondDescription,
} from '@/test/fixtures/boards';

const store = () => useBoardStore.getState();

/** The parts of a board that undo restores (undo stamps updatedAt and keeps the view). */
function content(board: Board) {
  return { cards: board.cards, notes: board.notes, name: board.name };
}

/** Opens the board, applies one change, then checks undo and redo against it. */
function expectUndoable(start: Board, recipe: (board: Board) => Board) {
  store().openBoard(start);
  const before = content(store().board);
  store().changeBoard(recipe);
  const after = content(store().board);
  expect(after).not.toEqual(before);
  store().undo();
  expect(content(store().board)).toEqual(before);
  store().redo();
  expect(content(store().board)).toEqual(after);
}

const character = () => fixtureCard('character', { x: 0, y: 0 });
const description = () => fixtureCard('description', { x: 600, y: 0, z: 2 });
const withNote = () => fixtureBoard([character()], [fixtureNote({ x: 0, y: 400 })]);

beforeEach(() => {
  store().openBoard(fixtureBoard([]));
});

describe('undo', () => {
  it('undo_draw_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) =>
      placeNewCard(b, fixtureCard('setting', { id: 'setting-new' }), { x: 400, y: 0 }),
    );
  });

  it('undo_turn_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) =>
      turnCardOnBoard(b, 'character-1', 'outer', 'cw'),
    );
  });

  it('undo_move_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) =>
      dropCard(b, 'character-1', { x: 900, y: 900 }, { x: 800, y: 800 }),
    );
  });

  it('undo_tuck_restoresBoard', () => {
    const start = fixtureBoard([character(), fixtureCard('motivation', { x: 600, y: 0, z: 2 })]);
    expectUndoable(start, (b) => dropCard(b, 'motivation-1', { x: 100, y: 100 }, { x: 20, y: 20 }));
  });

  it('undo_combine_restoresBoard', () => {
    expectUndoable(fixtureBoard([character(), description()]), (b) =>
      combineOnto(b, 'description-1', 'character-1'),
    );
  });

  it('undo_swap_restoresBoard', () => {
    const start = fixtureBoard([combinedCard('character'), secondDescription({ x: 600, z: 2 })]);
    expectUndoable(start, (b) => swapOnto(b, 'description-2', 'character-1'));
  });

  it('undo_split_restoresBoard', () => {
    expectUndoable(fixtureBoard([combinedCard('character')]), (b) =>
      splitCard(b, 'character-1', () => 'description-split'),
    );
  });

  it('undo_redraw_restoresBoard', () => {
    const drawn = fixtureCard('character', {
      id: 'drawn',
      rings: [
        { cues: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }], activeIndex: 0 },
      ],
    });
    expectUndoable(fixtureBoard([character()]), (b) => redrawCard(b, 'character-1', drawn));
  });

  it('undo_discard_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) => discardCard(b, 'character-1'));
  });

  it('undo_addNote_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) => addNote(b, { x: 0, y: 400 }, 'note-new'));
  });

  it('undo_editNoteText_restoresBoard', () => {
    expectUndoable(withNote(), (b) =>
      setNoteContent(b, 'note-1', { title: 'Note', text: 'A salvage crew' }),
    );
  });

  it('undo_moveNote_restoresBoard', () => {
    expectUndoable(withNote(), (b) => moveNote(b, 'note-1', 300, 500));
  });

  it('undo_resizeNote_restoresBoard', () => {
    expectUndoable(withNote(), (b) => resizeNote(b, 'note-1', 320, 240));
  });

  it('undo_deleteNote_restoresBoard', () => {
    expectUndoable(withNote(), (b) => deleteNote(b, 'note-1'));
  });

  it('undo_rename_restoresBoard', () => {
    expectUndoable(fixtureBoard([character()]), (b) => ({ ...b, name: 'Salvage Run' }));
  });
});
