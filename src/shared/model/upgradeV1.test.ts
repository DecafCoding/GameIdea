/**
 * Tests for the format 1 to 2 step shared by Dexie version 2 and UPGRADES[1].
 */
import { describe, expect, it } from 'vitest';
import { upgradeBoardV1 } from './upgradeV1';

function version1Record(): Record<string, unknown> {
  return {
    formatVersion: 1,
    id: 'b',
    name: 'Old',
    cards: [
      { id: 'a', type: 'role', tuckedUnder: null },
      { id: 'b', type: 'goal', tuckedUnder: 'a' },
    ],
    notes: [],
  };
}

describe('upgradeBoardV1', () => {
  it('upgradeBoardV1_version1Record_becomesFreeFormV2', () => {
    const next = upgradeBoardV1(version1Record());
    expect(next.formatVersion).toBe(2);
    expect(next.kind).toBe('free');
    expect(next.name).toBe('Old');
    expect(next.notes).toEqual([]);
  });

  it('upgradeBoardV1_everyCard_inConceptFalse', () => {
    const next = upgradeBoardV1(version1Record());
    expect(next.cards).toEqual([
      { id: 'a', type: 'role', tuckedUnder: null, inConcept: false },
      { id: 'b', type: 'goal', tuckedUnder: 'a', inConcept: false },
    ]);
  });

  it('upgradeBoardV1_noConceptWidth', () => {
    expect('conceptWidth' in upgradeBoardV1(version1Record())).toBe(false);
  });

  it('upgradeBoardV1_input_notMutated', () => {
    const record = version1Record();
    const copy = structuredClone(record);
    upgradeBoardV1(record);
    expect(record).toEqual(copy);
  });

  it('upgradeBoardV1_cardsMissing_leftForZod', () => {
    expect('cards' in upgradeBoardV1({ formatVersion: 1 })).toBe(false);
    expect(upgradeBoardV1({ formatVersion: 1, cards: 'x' }).cards).toBe('x');
    expect(upgradeBoardV1({ formatVersion: 1, cards: [7, null] }).cards).toEqual([7, null]);
  });
});
