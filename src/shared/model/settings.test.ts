/**
 * Tests for the Settings parser: defaults for a missing or bad record, field by field
 * for one bad field or an unknown version.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
  it('parseSettings_null_defaults', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('parseSettings_badJson_defaults', () => {
    expect(parseSettings('{mode: light')).toEqual(DEFAULT_SETTINGS);
  });

  it('parseSettings_array_defaults', () => {
    expect(parseSettings('[]')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('"light"')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('parseSettings_unknownMode_defaultModeOthersKept', () => {
    expect(
      parseSettings(JSON.stringify({ version: 1, mode: 'sepia', accent: 'green', snap: false })),
    ).toEqual({ version: 1, mode: 'dark', accent: 'green', snap: false });
  });

  it('parseSettings_snapString_defaultSnap', () => {
    expect(
      parseSettings(JSON.stringify({ version: 1, mode: 'light', accent: 'blue', snap: 'no' })),
    ).toEqual({ version: 1, mode: 'light', accent: 'blue', snap: true });
  });

  it('parseSettings_unknownVersion_readsFieldByField', () => {
    expect(
      parseSettings(
        JSON.stringify({ version: 7, mode: 'light', accent: 'purple', snap: false, extra: 1 }),
      ),
    ).toEqual({ version: 1, mode: 'light', accent: 'orange', snap: false });
  });

  it('parseSettings_valid_roundTrips', () => {
    const settings = {
      version: 1 as const,
      mode: 'light' as const,
      accent: 'green' as const,
      snap: false,
    };
    expect(parseSettings(JSON.stringify(settings))).toEqual(settings);
  });

  it('parseSettings_returnsCopy_defaultsNotShared', () => {
    const settings = parseSettings(null);
    settings.snap = false;
    expect(DEFAULT_SETTINGS.snap).toBe(true);
  });
});
