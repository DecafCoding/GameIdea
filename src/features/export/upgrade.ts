/**
 * Board file format upgrades (board-file-format and schema-versions in
 * docs/architecture.html). An imported file with an old formatVersion runs through the
 * steps, one version at a time, before the Zod check of the current format.
 *
 * To change the format: raise FORMAT_VERSION in shared/model, and add UPGRADES[old] that
 * turns a version-old file into a version-(old + 1) file. The runner sets formatVersion
 * after each step. A test fails while any version below FORMAT_VERSION has no step.
 * Format version 2 has 1 step, UPGRADES[1].
 */
import { FORMAT_VERSION, upgradeBoardV1 } from '@/shared/model';

export type UpgradeStep = (file: Record<string, unknown>) => Record<string, unknown>;

/**
 * Key n turns version n into n + 1. Step 1 makes a version 1 file a Free Form board with
 * every card inConcept: false, the same step Dexie schema version 2 runs on saved records.
 */
export const UPGRADES: Readonly<Record<number, UpgradeStep>> = {
  1: (file) => upgradeBoardV1(file),
};

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
