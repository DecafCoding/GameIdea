/**
 * The one-time pool split (pool-files): every rule and every error of splitDecks on a
 * tiny inline library, plus the genre value rule against the model's GENRES.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENRES } from '@/shared/model';
import { genreValue, splitDecks } from '../../scripts/split-decks.mjs';

type Entry = { card: string; games?: string[]; genres?: string[]; targets?: string[] };
type Decks = Record<string, Entry[]>;

const GENRE_LIB = { Roguelike: {}, 'Builder & Management': {} };
const BOTH = ['Builder & Management', 'Roguelike'];
const TAGGED = ['Mechanic', 'Resource', 'Progression', 'Constraint'];
const PLAIN = ['Player Role', 'Goal', 'Conflict', 'Setting', 'Mood', 'Twist'];

function tagged(prefix: string): Entry[] {
  return Array.from({ length: 10 }, (_, i) => ({
    card: `${prefix} ${i}`,
    games: ['A Game'],
    genres: [...BOTH],
  }));
}

function validDecks(): Decks {
  const decks: Decks = {};
  for (const name of PLAIN) {
    decks[name] = Array.from({ length: 4 }, (_, i) => ({ card: `${name} cue ${i}` }));
  }
  for (const name of TAGGED) decks[name] = tagged(name === 'Constraint' ? 'Only' : name);
  decks.Modifier = Array.from({ length: 20 }, (_, i) => ({
    card: `odd ${i}`,
    targets: ['Setting', 'Player Role', 'Resource'],
  }));
  return decks;
}

describe('splitDecks', () => {
  it('splitDecks_constraintCue_lowercasesFirstWordOnly', () => {
    const decks = validDecks();
    decks.Constraint![0] = { card: 'No combat With Swords', genres: [...BOTH] };
    decks.Constraint![1] = { card: 'Only first-person view', genres: [...BOTH] };
    const { pools } = splitDecks(decks, GENRE_LIB);
    expect(pools.constraint!.cues[0]!.text).toBe('no combat With Swords');
    expect(pools.constraint!.cues[1]!.text).toBe('only first-person view');
  });

  it('splitDecks_settingCue_dropsLeadingArticle', () => {
    const decks = validDecks();
    decks.Setting = [
      { card: 'the whole Earth' },
      { card: 'A tower' },
      { card: 'an inn' },
      { card: 'theater' },
    ];
    const { pools } = splitDecks(decks, GENRE_LIB);
    expect(pools.setting!.cues.map((c) => c.text)).toEqual([
      'whole Earth',
      'tower',
      'inn',
      'theater',
    ]);
  });

  it('splitDecks_repeatAfterRules_keepsFirstAndWarns', () => {
    const decks = validDecks();
    decks.Setting = [{ card: 'solar system' }, { card: 'the solar system' }, { card: 'moon' }];
    const { pools, report } = splitDecks(decks, GENRE_LIB);
    expect(pools.setting!.cues.map((c) => c.text)).toEqual(['solar system', 'moon']);
    expect(report).toContain(
      'WARN setting: "solar system" repeats an earlier cue and was dropped.',
    );
  });

  it('splitDecks_genreNames_becomeKebabInFileOrder', () => {
    const { pools } = splitDecks(validDecks(), GENRE_LIB);
    expect(pools.mechanic!.cues[0]!.genres).toEqual(['roguelike', 'builder-management']);
  });

  it('splitDecks_unknownGenre_throws', () => {
    const decks = validDecks();
    decks.Mechanic![0] = { card: 'jump', genres: ['any'] };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow('Unknown genre any on mechanic cue jump');
  });

  it('splitDecks_genresOnUntaggedDeck_throws', () => {
    const decks = validDecks();
    decks.Goal![0] = { card: 'win', genres: ['Roguelike'] };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow(/goal cue "win" has genres/);
  });

  it('splitDecks_missingGenresOnTaggedDeck_throws', () => {
    const decks = validDecks();
    decks.Resource![0] = { card: 'gold' };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow(/needs a list of genres/);
  });

  it('splitDecks_targets_mapToRoleResourceSetting', () => {
    const { pools } = splitDecks(validDecks(), GENRE_LIB);
    expect(pools.modifier!.cues[0]!.targets).toEqual(['role', 'resource', 'setting']);
  });

  it('splitDecks_unknownOrEmptyTargets_throws', () => {
    const unknown = validDecks();
    unknown.Modifier![0] = { card: 'tiny', targets: ['Goal'] };
    expect(() => splitDecks(unknown, GENRE_LIB)).toThrow(
      'Unknown target Goal on modifier cue tiny',
    );
    const empty = validDecks();
    empty.Modifier![0] = { card: 'tiny', targets: [] };
    expect(() => splitDecks(empty, GENRE_LIB)).toThrow(/needs a list of targets/);
    const elsewhere = validDecks();
    elsewhere.Mood![0] = { card: 'calm', targets: ['Setting'] };
    expect(() => splitDecks(elsewhere, GENRE_LIB)).toThrow(/has targets/);
  });

  it('splitDecks_genreBelow10_throwsNamingGenre', () => {
    const decks = validDecks();
    decks.Progression![0] = { card: 'levels', genres: ['Roguelike'] };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow(
      'The progression deck has 9 cues in genre Builder & Management; the floor is 10.',
    );
  });

  it('splitDecks_modifierDeckBelow20_throwsNamingTarget', () => {
    const decks = validDecks();
    decks.Modifier![0] = { card: 'odd 0', targets: ['Player Role', 'Setting'] };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow(/19 cues for target resource/);
  });

  it('splitDecks_games_areDropped', () => {
    const { pools } = splitDecks(validDecks(), GENRE_LIB);
    for (const pool of Object.values(pools)) {
      for (const cue of pool.cues) expect('games' in cue).toBe(false);
    }
  });

  it('splitDecks_ids_areStableAndPadded', () => {
    const { pools } = splitDecks(validDecks(), GENRE_LIB);
    expect(pools.mechanic!.cues.map((c) => c.id).slice(0, 2)).toEqual([
      'mechanic-0001',
      'mechanic-0002',
    ]);
    expect(Object.keys(pools)).toHaveLength(11);
  });

  it('splitDecks_unknownOrMissingDeck_throws', () => {
    const extra = { ...validDecks(), Weather: [] };
    expect(() => splitDecks(extra, GENRE_LIB)).toThrow('Unknown deck Weather');
    const missing = validDecks();
    delete missing.Twist;
    expect(() => splitDecks(missing, GENRE_LIB)).toThrow('Missing deck Twist');
  });

  it('splitDecks_emptyCard_throws', () => {
    const decks = validDecks();
    decks.Goal![0] = { card: '   ' };
    expect(() => splitDecks(decks, GENRE_LIB)).toThrow(/empty card/);
  });
});

describe('genreValue', () => {
  it('genreValue_ampersandNames_matchModelGenres', () => {
    const names = Object.keys(
      JSON.parse(readFileSync('docs/libraries/genres.json', 'utf8')) as Record<string, unknown>,
    );
    expect(names.map(genreValue)).toEqual([...GENRES]);
  });
});
