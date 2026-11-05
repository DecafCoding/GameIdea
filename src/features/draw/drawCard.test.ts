/**
 * Tests for drawCard and drawFor: cue counts, distinct cues, text-only copies, the genre
 * filter on tagged decks, the target filter on the Modifier decks, the excluded cues with
 * their fallback, and no mutation.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePool } from '@/shared/pools';
import {
  allGenresOn,
  GENRES,
  MOD_DECKS,
  type Deck,
  type Genre,
  type ModDeck,
  type Pool,
  type PoolCue,
  type Pools,
} from '@/shared/model';
import { cueKey, drawCard, drawFor } from './drawCard';

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

function pool(type: Deck, texts: string[], genres: Genre[] = ['roguelike']): Pool {
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
const ALL = { genres: GENRES };
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
      type: 'mechanic',
      cues: [
        ...pool('mechanic', ['a', 'b', 'c', 'd'], ['horror']).cues,
        ...pool('mechanic', ['e', 'f', 'g', 'h'], ['puzzle']).cues,
      ],
    };
    const random = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      expect(texts(drawCard('mechanic', mixed, { genres: ['horror'] }, { random })).sort()).toEqual(
        ['a', 'b', 'c', 'd'],
      );
    }
  });

  it('drawCard_cueInTwoGenres_drawnForEither', () => {
    const p: Pool = {
      type: 'progression',
      cues: [
        { id: 'm-1', text: 'shared', genres: ['horror', 'puzzle'] },
        { id: 'm-2', text: 'cyber', genres: ['horror'] },
        { id: 'm-3', text: 'opera', genres: ['puzzle'] },
      ],
    };
    expect(texts(drawCard('progression', p, { genres: ['horror'] })).sort()).toEqual([
      'cyber',
      'shared',
    ]);
    expect(texts(drawCard('progression', p, { genres: ['puzzle'] })).sort()).toEqual([
      'opera',
      'shared',
    ]);
  });

  it('drawCard_untaggedDeck_drawsFromFullPoolIgnoringGenres', () => {
    const plain: Pool = {
      type: 'goal',
      cues: [
        { id: 'g-1', text: 'a' },
        { id: 'g-2', text: 'b' },
      ],
    };
    expect(texts(drawCard('goal', plain)).sort()).toEqual(['a', 'b']);
    expect(texts(drawCard('goal', plain, { genres: ['horror'] })).sort()).toEqual(['a', 'b']);
  });

  it('drawCard_noMatchingCues_throws', () => {
    expect(() => drawCard('mechanic', pool('mechanic', six), { genres: ['horror'] })).toThrow();
  });

  it('drawCard_emptyGenres_throws', () => {
    expect(() => drawCard('mechanic', pool('mechanic', six), { genres: [] })).toThrow();
  });

  it('drawCard_mechanicOneGenre_drawsOnlyThatGenre', () => {
    const p: Pool = {
      type: 'mechanic',
      cues: [
        ...pool('mechanic', ['dig', 'sail', 'hide', 'trade'], ['rpg']).cues,
        ...pool('mechanic', ['shoot', 'dash', 'aim', 'reload'], ['shooter']).cues,
      ],
    };
    const random = mulberry32(11);
    for (let i = 0; i < 50; i++) {
      expect(texts(drawCard('mechanic', p, { genres: ['shooter'] }, { random })).sort()).toEqual([
        'aim',
        'dash',
        'reload',
        'shoot',
      ]);
    }
  });

  it('drawCard_taggedDeckWithoutGenres_throws', () => {
    expect(() => drawCard('resource', pool('resource', six))).toThrow(/genres/);
  });

  /** 4 Modifier cues for one deck. */
  const modCues = (modDeck: ModDeck, words: string[]): PoolCue[] =>
    words.map((text, i) => ({ id: `${modDeck}-${i}`, text, targets: [modDeck] }));
  const modifierPool: Pool = {
    type: 'modifier',
    cues: [
      ...modCues('role', ['tall', 'brave', 'old', 'quiet']),
      ...modCues('resource', ['rusty', 'stolen', 'spare', 'shiny']),
      ...modCues('setting', ['frozen', 'sunken', 'silent', 'flooded']),
    ],
  };
  const MOD_TEXTS: Record<ModDeck, string[]> = {
    role: ['brave', 'old', 'quiet', 'tall'],
    resource: ['rusty', 'shiny', 'spare', 'stolen'],
    setting: ['flooded', 'frozen', 'silent', 'sunken'],
  };

  it.each(MOD_DECKS)('drawCard_modifier%s_drawsOnlyItsTargets', (modDeck) => {
    const random = mulberry32(5);
    for (let i = 0; i < 20; i++) {
      const card = drawCard('modifier', modifierPool, { modDeck }, { random });
      expect(texts(card).sort()).toEqual(MOD_TEXTS[modDeck]);
    }
  });

  it('drawCard_modifierRole_drawsOnlyRoleTargets', () => {
    expect(texts(drawCard('modifier', modifierPool, { modDeck: 'role' })).sort()).toEqual(
      MOD_TEXTS.role,
    );
  });

  it('drawCard_modifier_setsModDeck', () => {
    expect(drawCard('modifier', modifierPool, { modDeck: 'setting' }).modDeck).toBe('setting');
    expect(drawCard('role', pool('role', six)).modDeck).toBeUndefined();
  });

  it('drawCard_modifierWithoutModDeck_throws', () => {
    expect(() => drawCard('modifier', modifierPool)).toThrow(/Modifier deck/);
  });

  it('drawCard_card_hasNoTargetsOrGenres', () => {
    const mod = drawCard('modifier', modifierPool, { modDeck: 'resource' });
    const mech = drawCard('mechanic', pool('mechanic', six), ALL);
    for (const card of [mod, mech]) {
      for (const cue of card.rings[0]!.cues) expect(Object.keys(cue)).toEqual(['text']);
      expect('targets' in card).toBe(false);
      expect('genres' in card).toBe(false);
    }
  });

  it('drawCard_newCard_isUnlockedAndNotOnTop', () => {
    const card = drawCard('role', pool('role', six));
    expect(card.locked).toBe(false);
    expect(card.onTopOf).toBeNull();
  });

  it('drawCard_realModifierPool_eachDeckDraws4Distinct', () => {
    const file = join(process.cwd(), 'public', 'pools', 'modifier.json');
    const real = parsePool('modifier', JSON.parse(readFileSync(file, 'utf8')));
    const byText = new Map(real.cues.map((cue) => [cue.text, cue]));
    const random = mulberry32(99);
    for (const modDeck of MOD_DECKS) {
      for (let i = 0; i < 200; i++) {
        const drawn = texts(drawCard('modifier', real, { modDeck }, { random }));
        expect(new Set(drawn).size).toBe(4);
        for (const text of drawn) expect(byText.get(text)?.targets).toContain(modDeck);
      }
    }
  });
});

describe('drawCard excluded', () => {
  const ten = [...six, 'scout', 'smith', 'bard', 'thief'];

  it('drawCard_excluded_neverDrawsExcludedCue', () => {
    const excluded = new Set(['navigator', 'diplomat', 'gardener', 'captain']);
    const random = mulberry32(11);
    for (let i = 0; i < 50; i++) {
      const drawn = texts(drawCard('role', pool('role', ten), ALL, { random, excluded }));
      expect(drawn).toHaveLength(4);
      for (const text of drawn) expect(excluded.has(text)).toBe(false);
    }
  });

  it('drawCard_excludedKey_matchesTrimmedLowercase', () => {
    expect(cueKey('  Pilot ')).toBe('pilot');
    const spaced = pool('role', ['  Pilot ', 'Medic', 'scout', 'smith', 'bard', 'thief']);
    const excluded = new Set([cueKey('pilot'), cueKey(' MEDIC')]);
    const random = mulberry32(3);
    for (let i = 0; i < 30; i++) {
      const drawn = texts(drawCard('role', spaced, ALL, { random, excluded })).map(cueKey);
      expect(drawn).not.toContain('pilot');
      expect(drawn).not.toContain('medic');
    }
  });

  it('drawCard_excludedLeavesTooFew_fallsBackToFilteredPool', () => {
    const excluded = new Set(['navigator', 'diplomat', 'gardener', 'captain']);
    const random = mulberry32(8);
    for (let i = 0; i < 20; i++) {
      const drawn = texts(drawCard('role', pool('role', six), ALL, { random, excluded }));
      expect(new Set(drawn).size).toBe(4);
      for (const text of drawn) expect(six).toContain(text);
    }
  });

  it('drawCard_excludedWithGenreFilter_fallbackKeepsGenreFilter', () => {
    const mixed: Pool = {
      type: 'mechanic',
      cues: [
        ...pool('mechanic', six, ['horror']).cues,
        ...pool('mechanic', ['dig', 'climb', 'swim', 'fly'], ['puzzle']).cues.map((c, i) => ({
          ...c,
          id: `p-${i}`,
        })),
      ],
    };
    const excluded = new Set(['navigator', 'diplomat', 'gardener']);
    const random = mulberry32(21);
    for (let i = 0; i < 20; i++) {
      const drawn = texts(
        drawCard('mechanic', mixed, { genres: ['horror'] }, { random, excluded }),
      );
      for (const text of drawn) expect(six).toContain(text);
    }
  });

  it('drawCard_noExcluded_sameCuesAsBefore', () => {
    const a = texts(drawCard('role', pool('role', ten), ALL, { random: mulberry32(4) }));
    const b = texts(
      drawCard('role', pool('role', ten), ALL, { random: mulberry32(4), excluded: new Set() }),
    );
    expect(b).toEqual(a);
  });
});

describe('drawFor', () => {
  const pools = {
    modifier: {
      type: 'modifier',
      cues: ['a', 'b', 'c', 'd', 'e'].map((text, i) => ({
        id: `m-${i}`,
        text,
        targets: i < 4 ? ['setting'] : ['role'],
      })),
    },
    mechanic: pool('mechanic', six, ['horror']),
  } as unknown as Pools;

  it('drawFor_modifier_keepsModDeck', () => {
    const like = drawCard('modifier', pools.modifier, { modDeck: 'setting' });
    const drawn = drawFor(like, pools, allGenresOn());
    expect(drawn.modDeck).toBe('setting');
    expect(texts(drawn).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drawFor_taggedDeck_usesBoardGenres', () => {
    const like = drawCard('mechanic', pools.mechanic, ALL);
    expect(() => drawFor(like, pools, { ...allGenresOn(), mechanic: ['puzzle'] })).toThrow();
    expect(texts(drawFor(like, pools, allGenresOn()))).toHaveLength(4);
  });

  it('drawFor_excludedOption_passesThrough', () => {
    const excluded = new Set(['navigator', 'diplomat']);
    const random = mulberry32(6);
    for (let i = 0; i < 20; i++) {
      const drawn = texts(
        drawFor({ type: 'mechanic' }, pools, allGenresOn(), { random, excluded }),
      );
      expect(drawn).not.toContain('navigator');
      expect(drawn).not.toContain('diplomat');
    }
  });

  it('drawFor_deckOnly_drawsLikeRail', () => {
    expect(() =>
      drawFor({ type: 'mechanic' }, pools, { ...allGenresOn(), mechanic: ['puzzle'] }),
    ).toThrow();
    const drawn = drawFor({ type: 'mechanic' }, pools, allGenresOn());
    expect(drawn.type).toBe('mechanic');
    expect(texts(drawn)).toHaveLength(4);
  });
});
