/**
 * Pool loading: fetches the 5 cue pool files from public/pools/ by web address,
 * so a later server can serve them with no app change.
 */
import type { Deck, Pool, Pools } from '@/shared/model';
import { parsePool } from './parsePool';

/** The web address of one pool file, relative to the app's base address. */
export function poolUrl(type: Deck): string {
  return `${import.meta.env.BASE_URL}pools/${type}.json`;
}

async function loadPool(type: Deck, fetchFn: typeof fetch): Promise<Pool> {
  const response = await fetchFn(poolUrl(type));
  if (!response.ok) {
    throw new Error(`The ${type} pool did not load (status ${response.status}).`);
  }
  return parsePool(type, await response.json());
}

/** The decks whose pools load: the 5 Phase 1 decks until all 11 pools are checked. */
const LOADED: Deck[] = ['role', 'goal', 'conflict', 'modifier', 'setting'];

/** Loads the pools. Rejects on a network error, a non-OK status, bad JSON or a bad shape. */
export async function loadPools(fetchFn: typeof fetch = fetch): Promise<Pools> {
  const pools = await Promise.all(LOADED.map((type) => loadPool(type, fetchFn)));
  return Object.fromEntries(pools.map((pool) => [pool.type, pool])) as Pools;
}
