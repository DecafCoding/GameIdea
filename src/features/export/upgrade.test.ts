/**
 * Tests for the format upgrade runner with injected steps, and the step registry.
 */
import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION } from '@/shared/model';
import { UPGRADES, upgradeBoardFile, type UpgradeStep } from './upgrade';

describe('upgradeBoardFile', () => {
  it('upgradeBoardFile_currentVersion_unchanged', () => {
    const file = { formatVersion: FORMAT_VERSION, name: 'A' };
    expect(upgradeBoardFile(file)).toEqual(file);
  });

  it('upgradeBoardFile_oldVersion_runsEachStepInOrder', () => {
    const calls: number[] = [];
    const step =
      (n: number): UpgradeStep =>
      (file) => {
        calls.push(n);
        expect(file.formatVersion).toBe(n);
        return { ...file, [`step${n}`]: true };
      };
    const target = 3;
    const result = upgradeBoardFile({ formatVersion: 1 }, { 1: step(1), 2: step(2) }, target);
    expect(calls).toEqual([1, 2]);
    expect(result).toEqual({ formatVersion: target, step1: true, step2: true });
  });

  it('upgradeBoardFile_newerVersion_null', () => {
    expect(upgradeBoardFile({ formatVersion: FORMAT_VERSION + 1 })).toBeNull();
  });

  it('upgradeBoardFile_missingStep_null', () => {
    expect(upgradeBoardFile({ formatVersion: 1 }, { 2: (f) => f }, 3)).toBeNull();
  });

  it('upgradeBoardFile_noVersion_null', () => {
    expect(upgradeBoardFile({ name: 'A' })).toBeNull();
    expect(upgradeBoardFile({ formatVersion: '1' })).toBeNull();
    expect(upgradeBoardFile({ formatVersion: 1.5 })).toBeNull();
    expect(upgradeBoardFile({ formatVersion: 0 })).toBeNull();
  });

  it('upgradeBoardFile_notObject_null', () => {
    expect(upgradeBoardFile(null)).toBeNull();
    expect(upgradeBoardFile([{ formatVersion: 1 }])).toBeNull();
    expect(upgradeBoardFile('board')).toBeNull();
  });

  it('upgradeBoardFile_version1File_returnsSameFile', () => {
    const file = { formatVersion: 1, name: 'A', cards: [{ id: 'a' }] };
    expect(upgradeBoardFile(file)).toEqual(file);
  });

  it('upgradeBoardFile_version2File_returnsNull', () => {
    // FORMAT_VERSION is 1, so version 2 is a newer format.
    expect(upgradeBoardFile({ formatVersion: FORMAT_VERSION + 1, name: 'A' })).toBeNull();
  });

  it('UPGRADES_formatVersion1_hasNoSteps', () => {
    expect(Object.keys(UPGRADES)).toEqual([]);
  });

  it('UPGRADES_everyOldVersion_hasStep', () => {
    for (let v = 1; v < FORMAT_VERSION; v++) expect(UPGRADES[v]).toBeTypeOf('function');
  });
});
