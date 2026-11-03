/**
 * Note actions: pure Board → Board recipes for notes (design 9.6). Each is one
 * finished change for the store's changeBoard.
 */
import { newId, type Board, type Note } from '@/shared/model';

/** The title of a new note. */
export const NOTE_TITLE = 'Note';

/** The size of a new note. */
export const NOTE_SIZE = { width: 310, height: 160 } as const;
/** Design 9.6: 300 to 320 px wide. */
export const NOTE_WIDTH = { min: 300, max: 320 } as const;
/** The smallest height that fits the label and 2 lines of text. */
export const NOTE_MIN_HEIGHT = 120;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A width and height inside the note limits. */
export function clampNoteSize(width: number, height: number): { width: number; height: number } {
  return {
    width: clamp(Math.round(width), NOTE_WIDTH.min, NOTE_WIDTH.max),
    height: Math.max(NOTE_MIN_HEIGHT, Math.round(height)),
  };
}

function changeNote(board: Board, id: string, change: (note: Note) => Note): Board {
  if (!board.notes.some((note) => note.id === id)) {
    throw new Error(`The board has no note ${id}.`);
  }
  return { ...board, notes: board.notes.map((note) => (note.id === id ? change(note) : note)) };
}

/** Adds an empty note at the spot. */
export function addNote(board: Board, spot: { x: number; y: number }, id: string = newId()): Board {
  const note: Note = { id, title: NOTE_TITLE, text: '', x: spot.x, y: spot.y, ...NOTE_SIZE };
  return { ...board, notes: [...board.notes, note] };
}

/** Sets the title and text. A blank title goes back to "Note". */
export function setNoteContent(
  board: Board,
  id: string,
  content: { title: string; text: string },
): Board {
  const title = content.title.trim() || NOTE_TITLE;
  return changeNote(board, id, (note) => ({ ...note, title, text: content.text }));
}

export function moveNote(board: Board, id: string, x: number, y: number): Board {
  return changeNote(board, id, (note) => ({ ...note, x, y }));
}

/** Resizes within 300 to 320 px wide and at least 120 px tall. */
export function resizeNote(board: Board, id: string, width: number, height: number): Board {
  return changeNote(board, id, (note) => ({ ...note, ...clampNoteSize(width, height) }));
}

export function deleteNote(board: Board, id: string): Board {
  return { ...board, notes: board.notes.filter((note) => note.id !== id) };
}
