/**
 * Tests for the pool loader, the pool parser and the usePools hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DECKS, GENRE_DECKS, type Deck, type Genre } from '@/shared/model';
import { loadPools, parsePool, poolUrl, usePools } from '.';

function fixture(type: Deck) {
  const extra = (GENRE_DECKS as readonly string[]).includes(type)
    ? { genres: ['horror'] }
    : type === 'modifier'
      ? { targets: ['role'] }
      : {};
  const cue = (n: number) =>
    type === 'setting'
      ? { id: `se-00${n}`, text: `place ${n}` }
      : { id: `${type}-${n}`, text: `${type} ${n}`, ...extra };
  return { type, cues: [cue(1), cue(2), cue(3), cue(4)] };
}

/** A fake fetch that serves the fixtures, with an optional status per type or a throw. */
function fakeFetch(options: { status?: Partial<Record<Deck, number>>; fail?: boolean } = {}) {
  return ((input: RequestInfo | URL) => {
    if (options.fail) return Promise.reject(new TypeError('Failed to fetch'));
    const url = input instanceof Request ? input.url : input.toString();
    const type = DECKS.find((t) => url.endsWith(`/pools/${t}.json`));
    if (!type) return Promise.resolve(new Response('', { status: 404 }));
    const status = options.status?.[type] ?? 200;
    return Promise.resolve(new Response(JSON.stringify(fixture(type)), { status }));
  }) as typeof fetch;
}

describe('loadPools', () => {
  it('loadPools_allFilesOk_returnsElevenPools', async () => {
    const pools = await loadPools(fakeFetch());
    expect(Object.keys(pools).sort()).toEqual([...DECKS].sort());
    expect(pools.setting.cues[0]).toEqual({
      id: 'se-001',
      text: 'place 1',
    });
  });

  it('loadPools_oneFileStatus404_rejects', async () => {
    await expect(loadPools(fakeFetch({ status: { conflict: 404 } }))).rejects.toThrow();
  });

  it('loadPools_fetchThrows_rejects', async () => {
    await expect(loadPools(fakeFetch({ fail: true }))).rejects.toThrow();
  });

  it('poolUrl_setting_endsWithPoolsSettingJson', () => {
    expect(poolUrl('setting').endsWith('pools/setting.json')).toBe(true);
  });
});

describe('parsePool', () => {
  it('parsePool_cueWithExtraKey_ignoresIt', () => {
    const data = {
      type: 'setting',
      cues: [{ id: 'a', text: 'b', kind: 'x' }],
    };
    expect(parsePool('setting', data).cues[0]).toEqual({ id: 'a', text: 'b' });
  });

  it('parsePool_typeMismatch_throws', () => {
    expect(() => parsePool('role', fixture('goal'))).toThrow();
  });

  it('parsePool_untaggedCueWithGenres_throws', () => {
    const data = { type: 'role', cues: [{ id: 'a', text: 'b', genres: ['horror'] }] };
    expect(() => parsePool('role', data)).toThrow(/genres/);
  });

  // A genre-tagged deck.
  const TAGGED: Deck = 'mechanic';

  /** A one-cue tagged pool whose cue has the given genres value. */
  const withGenres = (genres: unknown) => ({
    type: TAGGED,
    cues: [{ id: 'me-0001', text: 'dash', ...(genres === undefined ? {} : { genres }) }],
  });

  it('parsePool_missingGenres_throws', () => {
    expect(() => parsePool(TAGGED, withGenres(undefined))).toThrow(/genres/);
  });

  it('parsePool_emptyGenres_throws', () => {
    expect(() => parsePool(TAGGED, withGenres([]))).toThrow(/genres/);
  });

  it('parsePool_unknownGenre_throws', () => {
    expect(() => parsePool(TAGGED, withGenres(['steampunk']))).toThrow(/genres/);
  });

  it('parsePool_repeatedGenre_throws', () => {
    expect(() => parsePool(TAGGED, withGenres(['horror', 'horror']))).toThrow(/genres/);
  });

  it('parsePool_twoGenres_keepsBoth', () => {
    const genres: Genre[] = ['rpg', 'horror'];
    const pool = parsePool(TAGGED, withGenres(genres));
    expect(pool.cues[0]!.genres).toEqual(genres);
    expect(pool.cues[0]!.genres).not.toBe(genres);
  });
});

describe('parsePool targets', () => {
  const modifier = (targets: unknown) => ({
    type: 'modifier',
    cues: [{ id: 'mo-1', text: 'tall', ...(targets === undefined ? {} : { targets }) }],
  });

  it('parsePool_modifierWithoutTargets_throws', () => {
    expect(() => parsePool('modifier', modifier(undefined))).toThrow(/needs a list of targets/);
  });

  it('parsePool_modifierEmptyTargets_throws', () => {
    expect(() => parsePool('modifier', modifier([]))).toThrow(/targets/);
  });

  it('parsePool_modifierUnknownTarget_throws', () => {
    expect(() => parsePool('modifier', modifier(['goal']))).toThrow(/targets/);
  });

  it('parsePool_modifierRepeatedTarget_throws', () => {
    expect(() => parsePool('modifier', modifier(['role', 'role']))).toThrow(/targets/);
  });

  it('parsePool_modifierTargets_keptInOrder', () => {
    expect(parsePool('modifier', modifier(['setting', 'role'])).cues[0]).toEqual({
      id: 'mo-1',
      text: 'tall',
      targets: ['setting', 'role'],
    });
  });

  it('parsePool_targetsOnNonModifier_throws', () => {
    const data = { type: 'goal', cues: [{ id: 'a', text: 'b', targets: ['role'] }] };
    expect(() => parsePool('goal', data)).toThrow(/must not have targets/);
  });
});

describe('usePools', () => {
  it('usePools_fetchFailsThenRetrySucceeds_statusFailedThenReady', async () => {
    let fail = true;
    const ok = fakeFetch();
    const fetchFn = ((input: RequestInfo | URL) =>
      fail ? Promise.reject(new TypeError('Failed to fetch')) : ok(input)) as typeof fetch;

    const { result } = renderHook(() => usePools(fetchFn));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.pools).toBeNull();

    fail = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.pools?.role.cues).toHaveLength(4);
  });
});
