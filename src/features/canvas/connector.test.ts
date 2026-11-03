/**
 * Tests for the connector words between tucked cards: the lists for each pair, the saved
 * word and its fallback to the default, and the automatic "a" or "an".
 */
import { describe, expect, it } from 'vitest';
import type { CardType, CueKind } from '@/shared/model';
import { connectorFor, connectorWords, showWord, type Below } from './connector';

const below = (
  type: CardType,
  options: { kind?: CueKind; text?: string; saved?: string } = {},
): Below => ({
  type,
  kind: options.kind ?? null,
  text: options.text ?? 'outpost',
  saved: options.saved ?? null,
});

describe('connectorWords', () => {
  it('connectorWords_characterOverMotivation_wantsToFirst', () => {
    expect(connectorWords('character', 'motivation', null)?.[0]).toBe('wants to');
  });

  it('connectorWords_conflictUnderAnyCard_butFirst', () => {
    for (const upper of ['character', 'motivation', 'setting', 'description'] as const) {
      expect(connectorWords(upper, 'conflict', null)?.[0]).toBe('but');
    }
  });

  it('connectorWords_settingByKind_inWithFromFirst', () => {
    expect(connectorWords('character', 'setting', 'place')?.[0]).toBe('in the');
    expect(connectorWords('motivation', 'setting', 'object')?.[0]).toBe('with the');
    expect(connectorWords('conflict', 'setting', 'event')?.[0]).toBe('from the');
  });

  it('connectorWords_characterOverCharacter_andFirst', () => {
    expect(connectorWords('character', 'character', null)?.[0]).toBe('and');
  });

  it('connectorWords_noPair_null', () => {
    expect(connectorWords('description', 'setting', 'place')).toBeNull();
    expect(connectorWords('character', 'setting', null)).toBeNull();
    expect(connectorWords('setting', 'motivation', null)).toBeNull();
    expect(connectorWords('character', 'description', null)).toBeNull();
    expect(connectorWords('motivation', 'character', null)).toBeNull();
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
    expect(connectorFor('character', below('motivation'))).toMatchObject({
      word: 'wants to',
      text: 'wants to',
      type: 'motivation',
    });
  });

  it('connectorFor_savedWordInList_showsIt', () => {
    const connector = connectorFor(
      'character',
      below('setting', { kind: 'place', saved: 'aboard the' }),
    );
    expect(connector?.word).toBe('aboard the');
  });

  it('connectorFor_savedWordNotInList_default', () => {
    // A place word saved, then the Setting turned to an object.
    const connector = connectorFor(
      'character',
      below('setting', { kind: 'object', saved: 'aboard the' }),
    );
    expect(connector?.word).toBe('with the');
  });

  it('connectorFor_articleWord_showsAnBeforeVowel', () => {
    const connector = connectorFor(
      'character',
      below('setting', { kind: 'place', text: 'orbital dock', saved: 'in a' }),
    );
    expect(connector).toMatchObject({ word: 'in a', text: 'in an' });
    expect(connector?.options[1]).toEqual({ word: 'in a', text: 'in an' });
  });

  it('connectorFor_noPair_null', () => {
    expect(connectorFor('motivation', below('character'))).toBeNull();
  });
});
