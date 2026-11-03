/**
 * Storage module: the only folder that touches IndexedDB (through Dexie). The 5 actions are
 * the data seam for the rest of the app; autosave is the store watcher that state-store
 * places in this module.
 */
export {
  deleteBoard,
  listBoards,
  loadBoard,
  onBoardChangedElsewhere,
  saveBoard,
} from './boardStorage';
export { startAutosave, whenSaved } from './autosave';
