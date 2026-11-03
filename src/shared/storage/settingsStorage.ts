/**
 * The 3 settings actions of the storage seam (the recorded exception in
 * docs/feature-settings-and-theme.html, "Architecture fit"): the Settings record lives in
 * local storage under one key, read synchronously at start-up so the first render already
 * has it. Local storage can be missing or blocked (the getter, getItem or setItem can
 * throw); the rest of the app gets a plain value (canSave, 'blocked'), never an exception.
 */
import { DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY, type Settings } from '@/shared/model';

const PROBE_KEY = `${SETTINGS_KEY}.probe`;

/** True when a write to local storage works: a probe value is set, then removed. */
function canWrite(storage: Storage): boolean {
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * The stored Settings and whether a change can be saved. A blocked read gives the
 * defaults; a read that works with a write that fails keeps the stored value.
 */
export function loadSettings(): { settings: Settings; canSave: boolean } {
  let storage: Storage;
  let raw: string | null;
  try {
    storage = window.localStorage;
    raw = storage.getItem(SETTINGS_KEY);
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, canSave: false };
  }
  return { settings: parseSettings(raw), canSave: canWrite(storage) };
}

/** Writes the whole record. 'blocked' when local storage refuses the write. */
export function saveSettings(settings: Settings): 'done' | 'blocked' {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return 'done';
  } catch {
    return 'blocked';
  }
}

/**
 * Calls the handler with the new Settings when another tab of this address changes or
 * clears them (the storage event never fires in the tab that wrote). Returns the
 * unsubscribe.
 */
export function onSettingsChangedElsewhere(handler: (settings: Settings) => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY || event.key === null) handler(parseSettings(event.newValue));
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
