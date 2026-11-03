/**
 * Tests for drawCard: cue counts, distinct cues, kind copies, the genre filter and no
 * mutation.
 */
import { describe, expect, it } from 'vitest';
import { GENRES, type CardType, type Genre, type Pool } from '@/shared/model';
import { drawCard } from './drawCard';

/** mulberry32: a small seeded PRNG so draws repeat across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pool(type: CardType, texts: string[], genres: Genre[] = ['generic']): Pool {
  return {
    type,
    cues: texts.map((text, i) => ({
      id: `x-${i}`,
      text,
      genres: [...genres],
    })),
  };
}

const six = ['navigator', 'diplomat', 'gardener', 'captain', 'medic', 'pilot'];
const ALL = GENRES;
let idCount = 0;
const createId = () => `card-${++idCount}`;

const texts = (card: ReturnType<typeof drawCard>) => card.rings[0]!.cues.map((cue) => cue.text);

describe('drawCard', () => {
  it('drawCard_role_returnsOneRingOfFourDistinctCues', () => {
    const card = drawCard('role', pool('role', six), ALL, { createId });
    expect(card.rings).toHaveLength(1);
    expect(card.rings[0]!.activeIndex).toBe(0);
    expect(new Set(texts(card)).size).toBe(4);
    expect(card).toMatchObject({ type: 'role', x: 0, y: 0, z: 0, tuckedUnder: null });
  });

  it('drawCard_goal_returnsTwoCues', () => {
    const card = drawCard('goal', pool('goal', six), ALL);
    expect(texts(card)).toHaveLength(2);
  });

  it('drawCard_rolePool_cuesHaveOnlyText', () => {
    const card = drawCard('role', pool('role', six), ALL);
    for (const cue of card.rings[0]!.cues) expect(Object.keys(cue)).toEqual(['text']);
  });

  it('drawCard_poolWithDuplicateTexts_neverRepeatsText', () => {
    const dupes = pool('goal', ['a', 'A ', 'b', 'a', 'c', ' b']);
    const random = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const drawn = texts(drawCard('goal', dupes, ALL, { random })).map((t) =>
        t.trim().toLowerCase(),
      );
      expect(new Set(drawn).size).toBe(2);
    }
  });

  it('drawCard_poolTooSmall_throws', () => {
    expect(() => drawCard('role', pool('role', ['a', 'b', 'B', 'c']), ALL)).toThrow();
  });

  it('drawCard_typeMismatch_throws', () => {
    expect(() => drawCard('role', pool('setting', six), ALL)).toThrow();
  });

  it('drawCard_anyDraw_doesNotMutatePool', () => {
    const p = pool('role', six);
    const before = structuredClone(p);
    for (let i = 0; i < 20; i++) drawCard('role', p, ALL);
    expect(p).toEqual(before);
  });

  it('drawCard_sameSeed_sameCues', () => {
    const p = pool('role', six);
    const a = drawCard('role', p, ALL, { random: mulberry32(42) });
    const b = drawCard('role', p, ALL, { random: mulberry32(42) });
    expect(texts(a)).toEqual(texts(b));
  });

  it('drawCard_genres_onlyMatchingCues', () => {
    const mixed: Pool = {
      type: 'role',
      cues: [
        ...pool('role', ['a', 'b', 'c', 'd'], ['cyberpunk']).cues,
        ...pool('role', ['e', 'f', 'g', 'h'], ['space-opera']).cues,
      ],
    };
    const random = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      expect(texts(drawCard('role', mixed, ['cyberpunk'], { random })).sort()).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    }
  });

  it('drawCard_cueInTwoGenres_drawnForEither', () => {
    const p: Pool = {
      type: 'goal',
      cues: [
        { id: 'm-1', text: 'shared', genres: ['cyberpunk', 'space-opera'] },
        { id: 'm-2', text: 'cyber', genres: ['cyberpunk'] },
        { id: 'm-3', text: 'opera', genres: ['space-opera'] },
      ],
    };
    expect(texts(drawCard('goal', p, ['cyberpunk'])).sort()).toEqual(['cyber', 'shared']);
    expect(texts(drawCard('goal', p, ['space-opera'])).sort()).toEqual(['opera', 'shared']);
  });

  it('drawCard_noMatchingCues_throws', () => {
    expect(() => drawCard('role', pool('role', six), ['cyberpunk'])).toThrow();
  });

  it('drawCard_emptyGenres_throws', () => {
    expect(() => drawCard('role', pool('role', six), [])).toThrow();
  });
});
