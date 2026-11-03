/**
 * Tests for the pool loader, the pool parser and the usePools hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CARD_TYPES, type CardType, type Genre } from '@/shared/model';
import { loadPools, parsePool, poolUrl, usePools } from '.';

function fixture(type: CardType) {
  const cue = (n: number) =>
    type === 'setting'
      ? { id: `se-00${n}`, text: `place ${n}`, kind: 'place', genres: ['generic'] }
      : { id: `${type}-${n}`, text: `${type} ${n}`, genres: ['generic'] };
  return { type, cues: [cue(1), cue(2), cue(3), cue(4)] };
}

/** A fake fetch that serves the fixtures, with an optional status per type or a throw. */
function fakeFetch(options: { status?: Partial<Record<CardType, number>>; fail?: boolean } = {}) {
  return ((input: RequestInfo | URL) => {
    if (options.fail) return Promise.reject(new TypeError('Failed to fetch'));
    const url = input instanceof Request ? input.url : input.toString();
    const type = CARD_TYPES.find((t) => url.endsWith(`/pools/${t}.json`));
    if (!type) return Promise.resolve(new Response('', { status: 404 }));
    const status = options.status?.[type] ?? 200;
    return Promise.resolve(new Response(JSON.stringify(fixture(type)), { status }));
  }) as typeof fetch;
}

describe('loadPools', () => {
  it('loadPools_allFilesOk_returnsFivePools', async () => {
    const pools = await loadPools(fakeFetch());
    expect(Object.keys(pools).sort()).toEqual([...CARD_TYPES].sort());
    expect(pools.setting.cues[0]).toEqual({
      id: 'se-001',
      text: 'place 1',
      kind: 'place',
      genres: ['generic'],
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
  it('parsePool_settingCueWithoutKind_throws', () => {
    expect(() =>
      parsePool('setting', { type: 'setting', cues: [{ id: 'a', text: 'b' }] }),
    ).toThrow();
  });

  it('parsePool_characterCueWithKind_throws', () => {
    const data = { type: 'role', cues: [{ id: 'a', text: 'b', kind: 'place' }] };
    expect(() => parsePool('role', data)).toThrow();
  });

  it('parsePool_typeMismatch_throws', () => {
    expect(() => parsePool('role', fixture('goal'))).toThrow();
  });

  /** A one-cue role pool whose cue has the given genres value. */
  const withGenres = (genres: unknown) => ({
    type: 'role',
    cues: [{ id: 'ch-0001', text: 'pilot', ...(genres === undefined ? {} : { genres }) }],
  });

  it('parsePool_missingGenres_throws', () => {
    expect(() => parsePool('role', withGenres(undefined))).toThrow(/genres/);
  });

  it('parsePool_emptyGenres_throws', () => {
    expect(() => parsePool('role', withGenres([]))).toThrow(/genres/);
  });

  it('parsePool_unknownGenre_throws', () => {
    expect(() => parsePool('role', withGenres(['steampunk']))).toThrow(/genres/);
  });

  it('parsePool_repeatedGenre_throws', () => {
    expect(() => parsePool('role', withGenres(['cyberpunk', 'cyberpunk']))).toThrow(/genres/);
  });

  it('parsePool_twoGenres_keepsBoth', () => {
    const genres: Genre[] = ['sci-fi', 'cyberpunk'];
    const pool = parsePool('role', withGenres(genres));
    expect(pool.cues[0]!.genres).toEqual(genres);
    expect(pool.cues[0]!.genres).not.toBe(genres);
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
