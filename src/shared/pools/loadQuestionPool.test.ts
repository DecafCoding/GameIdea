/**
 * Tests for the question pool loader and the useQuestionPool hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadQuestionPool, questionPoolUrl, useQuestionPool } from '.';

const POOL = {
  type: 'question',
  cues: [
    { id: 'question-0001', text: 'Who is the player?' },
    { id: 'question-0002', text: 'What makes it fun?' },
  ],
};

/** A fake fetch that serves the question pool with a status, a body, or a throw. */
function fakeFetch(options: { status?: number; body?: unknown; fail?: boolean } = {}) {
  return ((input: RequestInfo | URL) => {
    if (options.fail) return Promise.reject(new TypeError('Failed to fetch'));
    const url = input instanceof Request ? input.url : input.toString();
    if (!url.endsWith('/pools/question.json')) {
      return Promise.resolve(new Response('', { status: 404 }));
    }
    return Promise.resolve(
      new Response(JSON.stringify(options.body ?? POOL), { status: options.status ?? 200 }),
    );
  }) as typeof fetch;
}

describe('loadQuestionPool', () => {
  it('loadQuestionPool_okResponse_returnsPool', async () => {
    expect(await loadQuestionPool(fakeFetch())).toEqual(POOL);
  });

  it('loadQuestionPool_notOk_rejects', async () => {
    await expect(loadQuestionPool(fakeFetch({ status: 404 }))).rejects.toThrow(/status 404/);
  });

  it('loadQuestionPool_badShape_rejects', async () => {
    await expect(
      loadQuestionPool(fakeFetch({ body: { type: 'goal', cues: [] } })),
    ).rejects.toThrow();
  });

  it('questionPoolUrl_endsWithPoolsQuestionJson', () => {
    expect(questionPoolUrl().endsWith('pools/question.json')).toBe(true);
  });
});

describe('useQuestionPool', () => {
  it('useQuestionPool_failThenRetry_becomesReady', async () => {
    let fail = true;
    const ok = fakeFetch();
    const fetchFn = ((input: RequestInfo | URL) =>
      fail ? Promise.reject(new TypeError('Failed to fetch')) : ok(input)) as typeof fetch;
    const { result } = renderHook(() => useQuestionPool(fetchFn));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.questions).toBeNull();
    fail = false;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.questions).toEqual(['Who is the player?', 'What makes it fun?']);
  });
});
