/**
 * The durable pool check (pool-files in docs/architecture.html): every file in
 * public/pools/ parses, ids and texts are unique in each pool, every genre has at least
 * 10 cues in each genre-tagged deck, each Modifier deck has at least 20 cues, and the
 * 2 split rules still hold. The pools are edited by hand after the split, so this test
 * is what keeps a later edit from breaking a floor.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECKS, GENRE_DECKS, GENRES, MOD_DECKS, type Deck, type Pool } from '@/shared/model';
import { parsePool } from './parsePool';

const DIR = join(process.cwd(), 'public', 'pools');

function load(type: Deck): Pool {
  return parsePool(type, JSON.parse(readFileSync(join(DIR, `${type}.json`), 'utf8')));
}

describe('pool files', () => {
  it('poolFiles_everyDeck_hasOneFileThatParses', () => {
    const files = readdirSync(DIR).filter((file) => file.endsWith('.json'));
    expect(files.map((file) => file.replace(/\.json$/, '')).sort()).toEqual([...DECKS].sort());
    for (const type of DECKS) expect(load(type).cues.length).toBeGreaterThan(0);
  });

  it('poolFiles_ids_areUniqueInEachPool', () => {
    for (const type of DECKS) {
      const ids = load(type).cues.map((cue) => cue.id);
      expect(new Set(ids).size, type).toBe(ids.length);
    }
  });

  it('poolFiles_texts_areDistinctInEachPool', () => {
    for (const type of DECKS) {
      const texts = load(type).cues.map((cue) => cue.text.trim().toLowerCase());
      expect(new Set(texts).size, type).toBe(texts.length);
    }
  });

  it('poolFiles_everyGenre_hasAtLeast10CuesInEachTaggedDeck', () => {
    const short: string[] = [];
    for (const type of GENRE_DECKS) {
      const cues = load(type).cues;
      for (const genre of GENRES) {
        const count = cues.filter((cue) => cue.genres?.includes(genre)).length;
        if (count < 10) short.push(`${type} ${genre}: ${count}`);
      }
    }
    expect(short).toEqual([]);
  });

  it('poolFiles_eachModifierDeck_hasAtLeast20Cues', () => {
    const cues = load('modifier').cues;
    for (const deck of MOD_DECKS) {
      const count = cues.filter((cue) => cue.targets?.includes(deck)).length;
      expect(count, `modifier ${deck}: ${count}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('poolFiles_constraintCues_startLowercase', () => {
    const bad = load('constraint').cues.filter((cue) => /^[A-Z]/.test(cue.text));
    expect(bad.map((cue) => cue.text)).toEqual([]);
  });

  it('poolFiles_settingCues_haveNoLeadingArticle', () => {
    const bad = load('setting').cues.filter((cue) => /^(the|a|an) /i.test(cue.text));
    expect(bad.map((cue) => cue.text)).toEqual([]);
  });
});
