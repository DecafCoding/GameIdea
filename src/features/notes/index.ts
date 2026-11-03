/**
 * Notes feature: notes, their board actions and the note view.
 * Other features use notes only through this file.
 */
export {
  addNote,
  clampNoteSize,
  deleteNote,
  moveNote,
  NOTE_MIN_HEIGHT,
  NOTE_SIZE,
  NOTE_WIDTH,
  resizeNote,
  setNoteContent,
} from './noteActions';
export { NoteView } from './NoteView';
