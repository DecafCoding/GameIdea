/**
 * Pool loading: fetches the 11 cue pool files from public/pools/ by web address,
 * so a later server can serve them with no app change (pool-files).
 */
import { DECKS, type Deck, type Pool, type Pools } from '@/shared/model';
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

/** Loads all 11 pools. Rejects on a network error, a non-OK status, bad JSON or a bad shape. */
export async function loadPools(fetchFn: typeof fetch = fetch): Promise<Pools> {
  const pools = await Promise.all(DECKS.map((type) => loadPool(type, fetchFn)));
  return Object.fromEntries(pools.map((pool) => [pool.type, pool])) as Pools;
}
