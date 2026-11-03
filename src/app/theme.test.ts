/**
 * Tests for the page root theme: attributes from Settings at start-up, after a change in
 * this tab and after a change in another tab.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changeSettings } from '@/features/settings';
import { SETTINGS_KEY } from '@/shared/model';
import { applyTheme, startTheme } from './theme';

const root = document.documentElement;
let stop: (() => void) | undefined;

beforeEach(() => {
  localStorage.clear();
  root.dataset.mode = 'dark';
  root.dataset.theme = 'orange';
});

afterEach(() => {
  stop?.();
  stop = undefined;
  localStorage.clear();
});

describe('theme', () => {
  it('applyTheme_lightBlue_setsAttributes', () => {
    const el = document.createElement('div');
    applyTheme({ mode: 'light', accent: 'blue' }, el);
    expect(el.dataset.mode).toBe('light');
    expect(el.dataset.theme).toBe('blue');
  });

  it('startTheme_storedGreen_appliesAtOnce', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ version: 1, mode: 'light', accent: 'green', snap: true }),
    );
    stop = startTheme();
    expect(root.dataset.mode).toBe('light');
    expect(root.dataset.theme).toBe('green');
  });

  it('startTheme_changeSettings_updatesRoot', () => {
    stop = startTheme();
    changeSettings({ accent: 'blue' });
    expect(root.dataset.theme).toBe('blue');
    changeSettings({ mode: 'light' });
    expect(root.dataset.mode).toBe('light');
  });

  it('startTheme_storageEventFromOtherTab_updatesRoot', () => {
    stop = startTheme();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SETTINGS_KEY,
        newValue: JSON.stringify({ version: 1, mode: 'light', accent: 'green', snap: true }),
      }),
    );
    expect(root.dataset.mode).toBe('light');
    expect(root.dataset.theme).toBe('green');
  });
});
