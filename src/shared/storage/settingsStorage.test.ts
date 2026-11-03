/**
 * Tests for the 3 settings actions: load with empty, stored and blocked storage, save and
 * its blocked result, and the storage event from another tab.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type Settings } from '@/shared/model';
import { loadSettings, onSettingsChangedElsewhere, saveSettings } from './settingsStorage';

const light: Settings = { version: 1, mode: 'light', accent: 'green', snap: false };

/** Replaces window.localStorage with a getter that throws, until restored. */
function blockLocalStorage(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError');
    },
  });
  return () => Object.defineProperty(window, 'localStorage', original);
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('loadSettings', () => {
  it('loadSettings_empty_defaultsAndCanSave', () => {
    expect(loadSettings()).toEqual({ settings: DEFAULT_SETTINGS, canSave: true });
    expect(localStorage.length).toBe(0);
  });

  it('loadSettings_storedLight_returnsIt', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(light));
    expect(loadSettings()).toEqual({ settings: light, canSave: true });
  });

  it('loadSettings_getterThrows_defaultsCannotSave', () => {
    const restore = blockLocalStorage();
    try {
      expect(loadSettings()).toEqual({ settings: DEFAULT_SETTINGS, canSave: false });
    } finally {
      restore();
    }
  });

  it('loadSettings_writeFails_keepsStoredCannotSave', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(light));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(loadSettings()).toEqual({ settings: light, canSave: false });
  });
});

describe('saveSettings', () => {
  it('saveSettings_writesWholeRecord', () => {
    expect(saveSettings(light)).toBe('done');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual(light);
  });

  it('saveSettings_setItemThrows_blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveSettings(light)).toBe('blocked');
  });
});

describe('onSettingsChangedElsewhere', () => {
  it('onSettingsChangedElsewhere_matchingKey_callsHandlerWithParsed', () => {
    const handler = vi.fn();
    const stop = onSettingsChangedElsewhere(handler);
    window.dispatchEvent(
      new StorageEvent('storage', { key: SETTINGS_KEY, newValue: JSON.stringify(light) }),
    );
    expect(handler).toHaveBeenCalledWith(light);
    stop();
  });

  it('onSettingsChangedElsewhere_clear_callsHandlerWithDefaults', () => {
    const handler = vi.fn();
    const stop = onSettingsChangedElsewhere(handler);
    window.dispatchEvent(new StorageEvent('storage', { key: null, newValue: null }));
    expect(handler).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    stop();
  });

  it('onSettingsChangedElsewhere_otherKey_ignored', () => {
    const handler = vi.fn();
    const stop = onSettingsChangedElsewhere(handler);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '{}' }));
    expect(handler).not.toHaveBeenCalled();
    stop();
  });

  it('onSettingsChangedElsewhere_unsubscribe_stops', () => {
    const handler = vi.fn();
    onSettingsChangedElsewhere(handler)();
    window.dispatchEvent(
      new StorageEvent('storage', { key: SETTINGS_KEY, newValue: JSON.stringify(light) }),
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
