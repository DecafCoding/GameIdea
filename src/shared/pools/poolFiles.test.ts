/**
 * Content checks for the cue pool files in public/pools/ (pool-files in docs/architecture.html):
 * shape, ids, kinds, genres, no repeated text and the compressed pool size. The genre pools hold
 * long cues on purpose, so there are no length, word-count or cue-count limits for now (feature
 * brief docs/feature-genre-pools.html, "Long cues").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CARD_TYPES, GENRES, type CardType, type PoolCue } from '@/shared/model';

const PREFIX: Record<CardType, string> = {
  character: 'ch',
  motivation: 'mo',
  setting: 'se',
  conflict: 'co',
  description: 'de',
};

/** Connector words that 2-cue types must not start with: cues are bare goals and obstacles. */
const NO_LEAD: Partial<Record<CardType, string>> = {
  motivation: 'wants to ',
  conflict: 'but ',
};

const KINDS = ['place', 'object', 'event'];

const poolPath = (type: CardType) => join(process.cwd(), 'public', 'pools', `${type}.json`);

function readPool(type: CardType): { type: string; cues: PoolCue[] } {
  return JSON.parse(readFileSync(poolPath(type), 'utf8')) as { type: string; cues: PoolCue[] };
}

describe('pool files', () => {
  for (const type of CARD_TYPES) {
    it(`poolFile_${type}_matchesPoolRules`, () => {
      const pool = readPool(type);
      expect(pool.type).toBe(type);

      const ids = pool.cues.map((cue) => cue.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(new RegExp(String.raw`^${PREFIX[type]}-\d{4}$`));
      }

      const texts = pool.cues.map((cue) => cue.text);
      expect(new Set(texts.map((text) => text.toLowerCase())).size).toBe(texts.length);
      const lead = NO_LEAD[type];
      for (const text of texts) {
        expect(text.length, text).toBeGreaterThan(0);
        expect(text, text).toBe(text.trim());
        expect(/\s{2,}/.test(text), text).toBe(false);
        if (lead) {
          expect(text.startsWith(lead), text).toBe(false);
        }
      }

      if (type === 'setting') {
        for (const cue of pool.cues) {
          expect(KINDS, cue.text).toContain(cue.kind);
        }
        expect(new Set(pool.cues.map((cue) => cue.kind))).toEqual(new Set(KINDS));
      } else {
        for (const cue of pool.cues) {
          expect(cue.kind, cue.text).toBeUndefined();
        }
      }

      for (const cue of pool.cues) {
        expect(Array.isArray(cue.genres), cue.text).toBe(true);
        expect(cue.genres.length, cue.text).toBeGreaterThan(0);
        expect(new Set(cue.genres).size, cue.text).toBe(cue.genres.length);
        for (const genre of cue.genres) {
          expect(GENRES, cue.text).toContain(genre);
        }
      }
      for (const genre of GENRES) {
        expect(
          pool.cues.some((cue) => cue.genres.includes(genre)),
          genre,
        ).toBe(true);
      }
    });
  }

  it('poolFiles_allFive_totalAtMost100KBGzip', () => {
    const total = CARD_TYPES.reduce(
      (sum, type) => sum + gzipSync(readFileSync(poolPath(type))).length,
      0,
    );
    expect(total).toBeLessThanOrEqual(100 * 1024);
  });
});
