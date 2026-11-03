/**
 * Tests for the connector words between tucked cards: the badge table for the 12 card
 * types, the saved word and its fallback to the default, and the automatic "a" or "an".
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
  const OTHERS = ['role', 'mechanic', 'resource', 'goal', 'conflict', 'setting'] as const;

  it.each([
    ['hook', 'role', ['You are a', 'You play a']],
    ['role', 'role', ['and a', 'with a']],
    ['goal', 'role', ['with a', 'and a']],
    ['mechanic', 'mechanic', ['and']],
    ['goal', 'goal', ['and']],
    ['constraint', 'constraint', ['and']],
    ['role', 'mechanic', ['who must', 'who can only', 'who learns to']],
    ['hook', 'mechanic', ['who must', 'who can only', 'who learns to']],
    ['mechanic', 'resource', ['using', 'while managing', 'spending']],
    ['resource', 'goal', ['to', 'until', 'so you can']],
    ['goal', 'conflict', ['but', 'while', 'even though']],
    ['role', 'setting', ['in the', 'aboard the', 'inside the']],
    ['conflict', 'mood', ['It feels', 'The tone is']],
    ['mood', 'twist', ['Except', 'The catch:']],
    ['twist', 'progression', ['As you play,', 'Over time,']],
    ['hook', 'progression', ['As you play,', 'Over time,']],
    ['progression', 'constraint', ['with', 'and']],
  ] as const)('connectorWords_eachPair_matchesBadgeTable (%s over %s)', (upper, lower, words) => {
    expect(connectorWords(upper, lower)).toEqual(words);
  });

  const OPTIONAL_WORDS = {
    mood: ['It feels', 'The tone is'],
    twist: ['Except', 'The catch:'],
    progression: ['As you play,', 'Over time,'],
    constraint: ['with', 'and'],
  } as const;
  const OPTIONAL_PAIRS = OTHERS.flatMap((upper) =>
    (Object.keys(OPTIONAL_WORDS) as (keyof typeof OPTIONAL_WORDS)[]).map(
      (lower) => [upper, lower, OPTIONAL_WORDS[lower]] as const,
    ),
  );

  it.each([
    ...OPTIONAL_PAIRS,
    ['mood', 'mood', ['and']],
    ['twist', 'twist', ['and']],
    ['progression', 'progression', ['and']],
  ] as const)(
    'connectorWords_optionalUnderEachCoreDeck_usesOwnWords (%s over %s)',
    (upper, lower, words) => {
      expect(connectorWords(upper, lower)).toEqual(words);
    },
  );

  it('connectorWords_lowerModifier_null', () => {
    for (const upper of [...OTHERS, 'hook', 'modifier'] as const) {
      expect(connectorWords(upper, 'modifier')).toBeNull();
    }
  });

  it('connectorWords_everyOtherDeckUnderAnother_hasWords', () => {
    for (const lower of ['mechanic', 'resource', 'goal', 'conflict', 'setting'] as const) {
      for (const upper of ['hook', ...OTHERS] as const) {
        expect(connectorWords(upper, lower), `${upper} over ${lower}`).not.toBeNull();
      }
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
    expect(connectorFor('role', below('modifier'))).toBeNull();
  });

  it('connectorFor_roleUnderHookBeforeVowel_isYouAreAn', () => {
    expect(connectorFor('hook', below('role', { text: 'astronaut' }))).toMatchObject({
      word: 'You are a',
      text: 'You are an',
    });
  });
});
