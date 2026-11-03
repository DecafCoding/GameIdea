/**
 * Tests for the connector words between tucked cards: the lists for each pair, the saved
 * word and its fallback to the default, and the automatic "a" or "an".
 */
import { describe, expect, it } from 'vitest';
import type { CardType } from '@/shared/model';
import { connectorFor, connectorWords, showWord, type Below } from './connector';

const below = (type: CardType, options: { text?: string; saved?: string } = {}): Below => ({
  type,
  text: options.text ?? 'outpost',
  saved: options.saved ?? null,
});

describe('connectorWords', () => {
  it('connectorWords_roleOverGoal_wantsToFirst', () => {
    expect(connectorWords('role', 'goal')?.[0]).toBe('wants to');
  });

  it('connectorWords_conflictUnderAnyCard_butFirst', () => {
    for (const upper of ['role', 'goal', 'setting', 'modifier'] as const) {
      expect(connectorWords(upper, 'conflict')?.[0]).toBe('but');
    }
  });

  it('connectorWords_settingUnderAnyCardButModifier_inTheFirst', () => {
    for (const upper of ['role', 'goal', 'conflict'] as const) {
      expect(connectorWords(upper, 'setting')?.[0]).toBe('in the');
    }
  });

  it('connectorWords_roleOverRole_andFirst', () => {
    expect(connectorWords('role', 'role')?.[0]).toBe('and');
  });

  it('connectorWords_noPair_null', () => {
    expect(connectorWords('modifier', 'setting')).toBeNull();
    expect(connectorWords('setting', 'goal')).toBeNull();
    expect(connectorWords('role', 'modifier')).toBeNull();
    expect(connectorWords('goal', 'role')).toBeNull();
  });
});

describe('showWord', () => {
  it('showWord_vowelStart_an', () => {
    expect(showWord('in a', 'orbital dock')).toBe('in an');
    expect(showWord('with a', 'Alien egg')).toBe('with an');
  });

  it('showWord_consonantStartOrNoArticle_unchanged', () => {
    expect(showWord('in a', 'prison asteroid')).toBe('in a');
    expect(showWord('in the', 'orbital dock')).toBe('in the');
    expect(showWord('wants to', 'escape')).toBe('wants to');
  });
});

describe('connectorFor', () => {
  it('connectorFor_nothingSaved_default', () => {
    expect(connectorFor('role', below('goal'))).toMatchObject({
      word: 'wants to',
      text: 'wants to',
      type: 'goal',
    });
  });

  it('connectorFor_savedWordInList_showsIt', () => {
    const connector = connectorFor('role', below('setting', { saved: 'aboard the' }));
    expect(connector?.word).toBe('aboard the');
  });

  it('connectorFor_savedWordNotInList_default', () => {
    const connector = connectorFor('role', below('setting', { saved: 'wants to' }));
    expect(connector?.word).toBe('in the');
  });

  it('connectorFor_articleWord_showsAnBeforeVowel', () => {
    const connector = connectorFor(
      'role',
      below('setting', { text: 'orbital dock', saved: 'in a' }),
    );
    expect(connector).toMatchObject({ word: 'in a', text: 'in an' });
    expect(connector?.options[1]).toEqual({ word: 'in a', text: 'in an' });
  });

  it('connectorFor_noPair_null', () => {
    expect(connectorFor('goal', below('role'))).toBeNull();
  });
});
