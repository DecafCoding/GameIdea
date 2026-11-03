/**
 * Tests for the theme boot script: for each stored value it sets the same mode and theme
 * as parseSettings, and it reads the same key.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { parseSettings, SETTINGS_KEY } from '@/shared/model';
import { THEME_BOOT_SCRIPT } from './themeBoot';

const root = document.documentElement;

function run(): void {
  root.setAttribute('data-mode', 'dark');
  root.setAttribute('data-theme', 'orange');
  // The script is a fixed string from this repo, run as the inline <head> script would be.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const boot = new Function(THEME_BOOT_SCRIPT) as () => void;
  boot();
}

afterEach(() => localStorage.clear());

const cases: [string, string | null][] = [
  ['none', null],
  ['badJson', '{mode'],
  ['lightGreen', JSON.stringify({ version: 1, mode: 'light', accent: 'green', snap: true })],
  ['darkBlue', JSON.stringify({ version: 1, mode: 'dark', accent: 'blue', snap: false })],
  ['unknownMode', JSON.stringify({ version: 1, mode: 'sepia', accent: 'blue' })],
  ['unknownAccent', JSON.stringify({ version: 1, mode: 'light', accent: 'purple' })],
  ['array', '[1]'],
];

describe('THEME_BOOT_SCRIPT', () => {
  for (const [name, raw] of cases) {
    it(`themeBoot_${name}_matchesParseSettings`, () => {
      if (raw !== null) localStorage.setItem(SETTINGS_KEY, raw);
      run();
      const expected = parseSettings(raw);
      expect(root.dataset.mode).toBe(expected.mode);
      expect(root.dataset.theme).toBe(expected.accent);
    });
  }

  it('themeBoot_getterThrows_keepsDefaults', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    try {
      run();
    } finally {
      Object.defineProperty(window, 'localStorage', original);
    }
    expect(root.dataset.mode).toBe('dark');
    expect(root.dataset.theme).toBe('orange');
  });

  it('themeBoot_key_matchesSettingsKey', () => {
    expect(THEME_BOOT_SCRIPT).toContain(`'${SETTINGS_KEY}'`);
  });
});
