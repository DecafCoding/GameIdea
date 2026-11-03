/**
 * The fixed words of the Settings dialog: the app version and footer line (design 9.11),
 * and the Keyboard list. The version is the package.json version as it is, put in at
 * build time; there is no build number.
 */

/** The package.json version. */
export const APP_VERSION: string = __APP_VERSION__;

export const FOOTER_TEXT = `GameIdea ${APP_VERSION} · No account. No data leaves this computer.`;

/** One row of the Keyboard list: the key caps, then what the key does. */
export interface Shortcut {
  keys: string[];
  does: string;
}

export const KEYBOARD_SHORTCUTS: readonly Shortcut[] = [
  { keys: ['R'], does: 'Turn the outer ring, or the only ring, one step' },
  { keys: ['Shift', 'R'], does: 'Turn the inner ring of a combined card' },
  { keys: ['Ctrl', 'Z'], does: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], does: 'Redo' },
];
