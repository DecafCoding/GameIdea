/**
 * Tests for the connector words between tucked cards: the GameIdea badge table for the 5
 * present types, the saved word and its fallback to the default, and the automatic "a" or
 * "an".
 */
import { describe, expect, it } from 'vitest';
import type { CardType } from '@/shared/model';
import { connectorFor, connectorWords, showWord, type Below } from './connector';

const below = (type: CardType, options: { text?: string; saved?: string } = {}): Below => ({
  type,
  text: options.text ?? 'frozen prairie',
  saved: options.saved ?? null,
});

describe('connectorWords', () => {
  it('connectorWords_roleOverRole_andAWithA', () => {
    expect(connectorWords('role', 'role')).toEqual(['and a', 'with a']);
  });

  it('connectorWords_sameDeckNotRoleOrModifier_and', () => {
    for (const type of ['goal', 'conflict', 'setting'] as const) {
      expect(connectorWords(type, type)).toEqual(['and']);
    }
  });

  it('connectorWords_lowerGoal_toUntilSoYouCan', () => {
    for (const upper of ['role', 'conflict', 'modifier', 'setting'] as const) {
      expect(connectorWords(upper, 'goal')).toEqual(['to', 'until', 'so you can']);
    }
  });

  it('connectorWords_lowerConflict_butWhileEvenThough', () => {
    for (const upper of ['role', 'goal', 'modifier', 'setting'] as const) {
      expect(connectorWords(upper, 'conflict')).toEqual(['but', 'while', 'even though']);
    }
  });

  it('connectorWords_lowerSetting_inTheAboardTheInsideThe', () => {
    for (const upper of ['role', 'goal', 'conflict', 'modifier'] as const) {
      expect(connectorWords(upper, 'setting')).toEqual(['in the', 'aboard the', 'inside the']);
    }
  });

  it('connectorWords_roleUnderNonRole_null', () => {
    for (const upper of ['goal', 'conflict', 'modifier', 'setting'] as const) {
      expect(connectorWords(upper, 'role')).toBeNull();
    }
  });

  it('connectorWords_lowerModifier_null', () => {
    for (const upper of ['role', 'goal', 'conflict', 'modifier', 'setting'] as const) {
      expect(connectorWords(upper, 'modifier')).toBeNull();
    }
  });
});

describe('showWord', () => {
  it('showWord_vowelStart_an', () => {
    expect(showWord('and a', 'archer')).toBe('and an');
    expect(showWord('with a', 'Outlaw')).toBe('with an');
  });

  it('showWord_consonantStartOrNoArticle_unchanged', () => {
    expect(showWord('and a', 'lighthouse keeper')).toBe('and a');
    expect(showWord('in the', 'abandoned mine')).toBe('in the');
    expect(showWord('to', 'escape')).toBe('to');
  });
});

describe('connectorFor', () => {
  it('connectorFor_nothingSaved_default', () => {
    expect(connectorFor('role', below('goal'))).toMatchObject({
      word: 'to',
      text: 'to',
      type: 'goal',
    });
  });

  it('connectorFor_savedWordInList_keepsIt', () => {
    const connector = connectorFor('role', below('setting', { saved: 'aboard the' }));
    expect(connector?.word).toBe('aboard the');
  });

  it('connectorFor_pairChanged_dropsSavedWord', () => {
    // "aboard the" was chosen over a Setting; the same card now sits under a Goal pair.
    const connector = connectorFor('role', below('goal', { saved: 'aboard the' }));
    expect(connector?.word).toBe('to');
  });

  it('connectorFor_articleWord_showsAnBeforeVowel', () => {
    const connector = connectorFor('role', below('role', { text: 'archer', saved: 'with a' }));
    expect(connector).toMatchObject({ word: 'with a', text: 'with an' });
    expect(connector?.options[0]).toEqual({ word: 'and a', text: 'and an' });
  });

  it('connectorFor_noPair_null', () => {
    expect(connectorFor('goal', below('role'))).toBeNull();
    expect(connectorFor('role', below('modifier'))).toBeNull();
  });
});
