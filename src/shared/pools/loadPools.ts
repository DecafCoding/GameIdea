/**
 * Pool loading: fetches the 5 cue pool files from public/pools/ by web address,
 * so a later server can serve them with no app change.
 */
import { CARD_TYPES, type CardType, type Pool, type Pools } from '@/shared/model';
import { parsePool } from './parsePool';

/** The web address of one pool file, relative to the app's base address. */
export function poolUrl(type: CardType): string {
  return `${import.meta.env.BASE_URL}pools/${type}.json`;
}

async function loadPool(type: CardType, fetchFn: typeof fetch): Promise<Pool> {
  const response = await fetchFn(poolUrl(type));
  if (!response.ok) {
    throw new Error(`The ${type} pool did not load (status ${response.status}).`);
  }
  return parsePool(type, await response.json());
}

/** Loads all 5 pools. Rejects on a network error, a non-OK status, bad JSON or a bad shape. */
export async function loadPools(fetchFn: typeof fetch = fetch): Promise<Pools> {
  const pools = await Promise.all(CARD_TYPES.map((type) => loadPool(type, fetchFn)));
  return Object.fromEntries(pools.map((pool) => [pool.type, pool])) as Pools;
}
