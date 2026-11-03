/**
 * The Settings record (docs/feature-settings-and-theme.html): the user's mode, theme color
 * and snap choice, kept in local storage under one key and never in a board, a board file,
 * the text file or the undo history. parseSettings reads a stored value field by field:
 * a missing record, bad JSON or an unknown value gives the default for that field.
 */

/** The local storage key that holds the whole Settings record as JSON. */
export const SETTINGS_KEY = 'gameidea.settings';

export const MODES = ['dark', 'light'] as const;
export type Mode = (typeof MODES)[number];

export const ACCENTS = ['orange', 'blue', 'green'] as const;
export type Accent = (typeof ACCENTS)[number];

export interface Settings {
  version: 1;
  mode: Mode;
  accent: Accent;
  /** Dropped free cards and notes snap to the 24 px grid; Alt skips it. */
  snap: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  mode: 'dark',
  accent: 'orange',
  snap: true,
};

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/**
 * The Settings in a stored value. Null, bad JSON or a value that is not an object gives the
 * defaults; otherwise each valid field is kept and each other field takes its default. The
 * version is always 1: an unknown version is read field by field.
 */
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return { ...DEFAULT_SETTINGS };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return { ...DEFAULT_SETTINGS };
  }
  const value = json as Record<string, unknown>;
  return {
    version: 1,
    mode: isOneOf(MODES, value.mode) ? value.mode : DEFAULT_SETTINGS.mode,
    accent: isOneOf(ACCENTS, value.accent) ? value.accent : DEFAULT_SETTINGS.accent,
    snap: typeof value.snap === 'boolean' ? value.snap : DEFAULT_SETTINGS.snap,
  };
}
