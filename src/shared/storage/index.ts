/**
 * Storage module: the only folder that touches IndexedDB (through Dexie) or local storage.
 * The 5 board actions plus the 3 settings actions (the recorded exception in
 * docs/feature-settings-and-theme.html) are the data seam for the rest of the app; autosave
 * is the store watcher that state-store places in this module.
 */
export {
  deleteBoard,
  listBoards,
  loadBoard,
  onBoardChangedElsewhere,
  saveBoard,
} from './boardStorage';
export { startAutosave, whenSaved } from './autosave';
export { loadSettings, onSettingsChangedElsewhere, saveSettings } from './settingsStorage';
