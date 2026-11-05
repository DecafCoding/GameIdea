/**
 * useQuestionPool: loads the question pool on mount and exposes the load state, the
 * question texts in file order and a retry. The Questions panel shows its own error with
 * Retry while the status is 'failed'; the deck buttons do not depend on it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadQuestionPool } from './loadQuestionPool';

export interface QuestionPoolState {
  status: 'loading' | 'ready' | 'failed';
  /** The question texts in file order; null until the pool is ready. */
  questions: readonly string[] | null;
  retry: () => void;
}

type LoadResult = Pick<QuestionPoolState, 'status' | 'questions'>;

export function useQuestionPool(fetchFn?: typeof fetch): QuestionPoolState {
  const [result, setResult] = useState<LoadResult>({ status: 'loading', questions: null });
  // Each load gets a number; a result from an older load or after unmount is dropped.
  const attempt = useRef(0);

  const load = useCallback(() => {
    const current = ++attempt.current;
    loadQuestionPool(fetchFn).then(
      (pool) => {
        if (attempt.current === current) {
          setResult({ status: 'ready', questions: pool.cues.map((cue) => cue.text) });
        }
      },
      () => {
        if (attempt.current === current) setResult({ status: 'failed', questions: null });
      },
    );
  }, [fetchFn]);

  useEffect(() => {
    const counter = attempt;
    load();
    return () => {
      counter.current++;
    };
  }, [load]);

  const retry = useCallback(() => {
    setResult({ status: 'loading', questions: null });
    load();
  }, [load]);

  return { ...result, retry };
}
