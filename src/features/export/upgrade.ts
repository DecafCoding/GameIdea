/**
 * Board file format upgrades (board-file-format and schema-versions in
 * docs/architecture.html). An imported file with an old formatVersion runs through the
 * steps, one version at a time, before the Zod check of the current format.
 *
 * To change the format: raise FORMAT_VERSION in shared/model, and add UPGRADES[old] that
 * turns a version-old file into a version-(old + 1) file. The runner sets formatVersion
 * after each step. A test fails while any version below FORMAT_VERSION has no step.
 */
import { everyDeck, FORMAT_VERSION, GENRES, type Genre } from '@/shared/model';

/** Version 3 notes had a fixed "Premise" label; on upgrade it becomes each note's title. */
export const OLD_NOTE_TITLE = 'Premise';

export type UpgradeStep = (file: Record<string, unknown>) => Record<string, unknown>;

/** Key n turns version n into n + 1. */
export const UPGRADES: Readonly<Record<number, UpgradeStep>> = {
  // Version 1 had no genres; an old board draws from all 4, the same mix as before.
  // A stray genres key on a version 1 file is overwritten too.
  1: (file) => ({ ...file, genres: [...GENRES] }),
  // Version 2 had 1 list for the whole board; each deck gets a copy, the same mix as before.
  // A genres value that is not an array is left alone, so the Zod check rejects the file.
  // The cast is safe because the Zod check runs after the upgrade and rejects unknown genres.
  2: (file) =>
    Array.isArray(file.genres) ? { ...file, genres: everyDeck(file.genres as Genre[]) } : file,
  // Version 3 notes had no title. Anything that is not a plain note is left alone for Zod.
  3: (file) =>
    Array.isArray(file.notes)
      ? { ...file, notes: file.notes.map((note: unknown) => withNoteTitle(note)) }
      : file,
  // Version 5 added the optional card connector; a version 4 card has none, so nothing changes.
  4: (file) => file,
};

function withNoteTitle(note: unknown): unknown {
  return isPlainObject(note) ? { ...note, title: OLD_NOTE_TITLE } : note;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Brings a parsed file up to the target version. Null when the file is not a plain object,
 * has no integer formatVersion from 1 to target, or a step is missing.
 */
export function upgradeBoardFile(
  file: unknown,
  steps: Readonly<Record<number, UpgradeStep>> = UPGRADES,
  target: number = FORMAT_VERSION,
): Record<string, unknown> | null {
  if (!isPlainObject(file)) return null;
  const version = file.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) return null;
  if (version < 1 || version > target) return null;
  let current = file;
  for (let v = version; v < target; v++) {
    const step = steps[v];
    if (!step) return null;
    current = { ...step(current), formatVersion: v + 1 };
  }
  return current;
}
