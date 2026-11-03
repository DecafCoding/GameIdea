/**
 * usePools: loads the pools on mount and exposes the load state and a retry.
 * The pools banner shows while the status is 'failed'.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pools } from '@/shared/model';
import { loadPools } from './loadPools';

export interface PoolsState {
  status: 'loading' | 'ready' | 'failed';
  pools: Pools | null;
  retry: () => void;
}

type LoadResult = Pick<PoolsState, 'status' | 'pools'>;

export function usePools(fetchFn?: typeof fetch): PoolsState {
  const [result, setResult] = useState<LoadResult>({ status: 'loading', pools: null });
  // Each load gets a number; a result from an older load or after unmount is dropped.
  const attempt = useRef(0);

  const load = useCallback(() => {
    const current = ++attempt.current;
    loadPools(fetchFn).then(
      (pools) => {
        if (attempt.current === current) setResult({ status: 'ready', pools });
      },
      () => {
        if (attempt.current === current) setResult({ status: 'failed', pools: null });
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
    setResult({ status: 'loading', pools: null });
    load();
  }, [load]);

  return { ...result, retry };
}
