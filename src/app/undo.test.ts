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
  secondModifier,
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

const role = () => fixtureCard('role', { x: 0, y: 0 });
const modifier = () => fixtureCard('modifier', { x: 600, y: 0, z: 2 });
const withNote = () => fixtureBoard([role()], [fixtureNote({ x: 0, y: 400 })]);

beforeEach(() => {
  store().openBoard(fixtureBoard([]));
});

describe('undo', () => {
  it('undo_draw_restoresBoard', () => {
    expectUndoable(fixtureBoard([role()]), (b) =>
      placeNewCard(b, fixtureCard('setting', { id: 'setting-new' }), { x: 400, y: 0 }),
    );
  });

  it('undo_turn_restoresBoard', () => {
    expectUndoable(fixtureBoard([role()]), (b) => turnCardOnBoard(b, 'role-1', 'outer', 'cw'));
  });

  it('undo_move_restoresBoard', () => {
    expectUndoable(fixtureBoard([role()]), (b) =>
      dropCard(b, 'role-1', { x: 900, y: 900 }, { x: 800, y: 800 }),
    );
  });

  it('undo_tuck_restoresBoard', () => {
    const start = fixtureBoard([role(), fixtureCard('goal', { x: 600, y: 0, z: 2 })]);
    expectUndoable(start, (b) => dropCard(b, 'goal-1', { x: 100, y: 100 }, { x: 20, y: 20 }));
  });

  it('undo_combine_restoresBoard', () => {
    expectUndoable(fixtureBoard([role(), modifier()]), (b) =>
      combineOnto(b, 'modifier-1', 'role-1'),
    );
  });

  it('undo_swap_restoresBoard', () => {
    const start = fixtureBoard([combinedCard('role'), secondModifier({ x: 600, z: 2 })]);
    expectUndoable(start, (b) => swapOnto(b, 'modifier-2', 'role-1'));
  });

  it('undo_split_restoresBoard', () => {
    expectUndoable(fixtureBoard([combinedCard('role')]), (b) =>
      splitCard(b, 'role-1', () => 'modifier-split'),
    );
  });

  it('undo_redraw_restoresBoard', () => {
    const drawn = fixtureCard('role', {
      id: 'drawn',
      rings: [
        { cues: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }], activeIndex: 0 },
      ],
    });
    expectUndoable(fixtureBoard([role()]), (b) => redrawCard(b, 'role-1', drawn));
  });

  it('undo_discard_restoresBoard', () => {
    expectUndoable(fixtureBoard([role()]), (b) => discardCard(b, 'role-1'));
  });

  it('undo_addNote_restoresBoard', () => {
    expectUndoable(fixtureBoard([role()]), (b) => addNote(b, { x: 0, y: 400 }, 'note-new'));
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
    expectUndoable(fixtureBoard([role()]), (b) => ({ ...b, name: 'Salvage Run' }));
  });
});
