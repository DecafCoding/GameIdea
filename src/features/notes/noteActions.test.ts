/**
 * Tests for the note actions and their size limits.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, fixtureNote } from '@/test/fixtures/boards';
import { addNote, deleteNote, moveNote, resizeNote, setNoteContent } from './noteActions';

const board = fixtureBoard([], [fixtureNote()]);

describe('noteActions', () => {
  it('addNote_spot_addsEmptyNoteTitledNote', () => {
    const next = addNote(fixtureBoard([]), { x: 24, y: 48 }, 'n1');
    expect(next.notes).toEqual([
      { id: 'n1', title: 'Note', text: '', x: 24, y: 48, width: 310, height: 160 },
    ]);
  });

  it('setNoteContent_titleAndText_replacesBoth', () => {
    const next = setNoteContent(board, 'note-1', { title: 'Logline', text: 'A ship\nadrift' });
    expect(next.notes[0]).toMatchObject({ title: 'Logline', text: 'A ship\nadrift' });
  });

  it('setNoteContent_blankTitle_backToNote', () => {
    const next = setNoteContent(board, 'note-1', { title: '  ', text: '' });
    expect(next.notes[0]!.title).toBe('Note');
  });

  it('moveNote_xy_movesNote', () => {
    expect(moveNote(board, 'note-1', 5, 6).notes[0]).toMatchObject({ x: 5, y: 6 });
  });

  it('resizeNote_tooWide_clampsTo320', () => {
    expect(resizeNote(board, 'note-1', 500, 200).notes[0]).toMatchObject({
      width: 320,
      height: 200,
    });
    expect(resizeNote(board, 'note-1', 100, 200).notes[0]!.width).toBe(300);
  });

  it('resizeNote_tooShort_clampsTo120', () => {
    expect(resizeNote(board, 'note-1', 310, 40).notes[0]!.height).toBe(120);
  });

  it('deleteNote_id_removesNote', () => {
    expect(deleteNote(board, 'note-1').notes).toEqual([]);
  });
});
