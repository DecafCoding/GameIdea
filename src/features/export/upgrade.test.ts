/**
 * Tests for the format upgrade runner with injected steps, and the step registry.
 */
import { describe, expect, it } from 'vitest';
import { everyDeck, FORMAT_VERSION, GENRES } from '@/shared/model';
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
    const result = upgradeBoardFile({ formatVersion: 1 }, { 1: step(1), 2: step(2) }, 3);
    expect(calls).toEqual([1, 2]);
    expect(result).toEqual({ formatVersion: 3, step1: true, step2: true });
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

  it('UPGRADES1_version1File_getsAllGenres', () => {
    const file = { formatVersion: 1, name: 'Old', genres: ['cyberpunk'] };
    expect(UPGRADES[1]!(file)).toEqual({ formatVersion: 1, name: 'Old', genres: [...GENRES] });
  });

  it('upgrade_version1File_getsAllGenresInEveryDeck', () => {
    expect(upgradeBoardFile({ formatVersion: 1, name: 'Old' })).toEqual({
      formatVersion: FORMAT_VERSION,
      name: 'Old',
      genres: everyDeck(GENRES),
    });
  });

  it('upgrade_version2File_copiesGenresToEveryDeck', () => {
    expect(upgradeBoardFile({ formatVersion: 2, genres: ['cyberpunk'] })).toEqual({
      formatVersion: FORMAT_VERSION,
      genres: everyDeck(['cyberpunk']),
    });
  });

  it('upgrade_version2FileWithoutGenresArray_leavesGenres', () => {
    expect(upgradeBoardFile({ formatVersion: 2, genres: 'cyberpunk' })).toEqual({
      formatVersion: FORMAT_VERSION,
      genres: 'cyberpunk',
    });
  });

  it('upgrade_version3File_notesGetPremiseTitle', () => {
    expect(upgradeBoardFile({ formatVersion: 3, notes: [{ id: 'n', text: 'A' }] })).toEqual({
      formatVersion: FORMAT_VERSION,
      notes: [{ id: 'n', text: 'A', title: 'Premise' }],
    });
  });

  it('UPGRADES4_version4File_unchanged', () => {
    const file = { formatVersion: 4, name: 'Old', cards: [{ id: 'a' }] };
    expect(UPGRADES[4]!(file)).toEqual(file);
  });

  it('UPGRADES_everyOldVersion_hasStep', () => {
    for (let v = 1; v < FORMAT_VERSION; v++) expect(UPGRADES[v]).toBeTypeOf('function');
  });
});
