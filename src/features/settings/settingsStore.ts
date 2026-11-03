/**
 * The settings store: the Settings record and whether this browser can save it, in a small
 * Zustand store with no undo (settings never enter the board's undo history). A change
 * applies at once and writes the whole record through the storage seam; a blocked write
 * keeps the change for this page and sets canSave to false. Another tab's change arrives
 * through startSettingsSync and is applied without a write.
 */
import { create } from 'zustand';
import { DEFAULT_SETTINGS, type Settings } from '@/shared/model';
import { loadSettings, onSettingsChangedElsewhere, saveSettings } from '@/shared/storage';

export type SettingsPatch = Partial<Omit<Settings, 'version'>>;

export interface SettingsState {
  settings: Settings;
  canSave: boolean;
  /** Reads the stored Settings (synchronous, before the first render). */
  init: () => void;
  /** Applies a change at once, then saves the whole record. */
  change: (patch: SettingsPatch) => void;
  /** Applies Settings from another tab, with no write. */
  replace: (settings: Settings) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  canSave: true,
  init: () => set(loadSettings()),
  change: (patch) => {
    const next: Settings = { ...get().settings, ...patch, version: 1 };
    set({ settings: next });
    if (saveSettings(next) === 'blocked') set({ canSave: false });
  },
  replace: (settings) => set({ settings }),
}));

/** Follows Settings changes made in other tabs. Returns the stop. */
export function startSettingsSync(): () => void {
  return onSettingsChangedElsewhere((settings) => useSettingsStore.getState().replace(settings));
}

/** The current Settings, for a component. */
export function useSettings(): Settings {
  return useSettingsStore((state) => state.settings);
}

/** False when this browser does not save settings. */
export function useCanSaveSettings(): boolean {
  return useSettingsStore((state) => state.canSave);
}

/** The current Settings, outside React. */
export function getSettings(): Settings {
  return useSettingsStore.getState().settings;
}

/** Applies a change at once and saves it. */
export function changeSettings(patch: SettingsPatch): void {
  useSettingsStore.getState().change(patch);
}

/** Reads the stored Settings. Call once at start-up, before the first render. */
export function initSettings(): void {
  useSettingsStore.getState().init();
}

/** Calls the listener with the new Settings on every change. Returns the unsubscribe. */
export function subscribeSettings(listener: (settings: Settings) => void): () => void {
  return useSettingsStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) listener(state.settings);
  });
}
