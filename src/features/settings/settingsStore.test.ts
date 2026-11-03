/**
 * Tests for the settings store: a change writes the whole record, a blocked write keeps the
 * change, another tab's change replaces the settings, and settings never touch the board
 * store or its undo history.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@/shared/model';
import { useBoardStore } from '@/shared/store';
import { startSettingsSync, useSettingsStore } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, canSave: true });
});
afterEach(() => vi.restoreAllMocks());

describe('settingsStore', () => {
  it('change_writesWholeRecord', () => {
    useSettingsStore.getState().change({ mode: 'light' });
    expect(useSettingsStore.getState().settings.mode).toBe('light');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      version: 1,
      mode: 'light',
      accent: 'orange',
      snap: true,
    });
  });

  it('change_blocked_keepsChangeAndCanSaveFalse', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    useSettingsStore.getState().change({ accent: 'blue' });
    expect(useSettingsStore.getState().settings.accent).toBe('blue');
    expect(useSettingsStore.getState().canSave).toBe(false);
  });

  it('init_storedRecord_loadsIt', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ version: 1, mode: 'light', accent: 'green', snap: false }),
    );
    useSettingsStore.getState().init();
    expect(useSettingsStore.getState().settings).toEqual({
      version: 1,
      mode: 'light',
      accent: 'green',
      snap: false,
    });
  });

  it('startSettingsSync_storageEvent_replacesSettings', () => {
    const stop = startSettingsSync();
    const other = { version: 1, mode: 'light', accent: 'blue', snap: false };
    window.dispatchEvent(
      new StorageEvent('storage', { key: SETTINGS_KEY, newValue: JSON.stringify(other) }),
    );
    expect(useSettingsStore.getState().settings).toEqual(other);
    stop();
  });

  it('change_neverTouchesBoardStoreOrUndo', () => {
    const board = useBoardStore.getState().board;
    const past = useBoardStore.temporal.getState().pastStates.length;
    const seq = useBoardStore.getState().saveSeq;
    useSettingsStore.getState().change({ mode: 'light', accent: 'green', snap: false });
    expect(useBoardStore.getState().board).toBe(board);
    expect(useBoardStore.getState().saveSeq).toBe(seq);
    expect(useBoardStore.temporal.getState().pastStates.length).toBe(past);
  });
});
