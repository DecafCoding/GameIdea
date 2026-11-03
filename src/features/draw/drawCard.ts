/**
 * Draw logic: builds one new card of a type from its pool, with distinct cues. For a
 * genre-tagged deck, only cues that share a genre with the deck's genres on the board are
 * drawn; every other deck draws from its full pool (CLAUDE.md "Draws").
 * Used by the deck buttons and Redraw; the caller places the returned card.
 */
import {
  CUES_PER_CARD,
  newId,
  type Card,
  type CardType,
  type Cue,
  type Genre,
  type Pool,
} from '@/shared/model';

export interface DrawOptions {
  /** Returns a number in [0, 1). Defaults to Math.random. */
  random?: () => number;
  /** Returns a new card id. Defaults to newId. */
  createId?: () => string;
}

/**
 * Draws one card: one ring of distinct cues (4 or 2 by type), first cue active, at 0,0.
 * genres are the genres of the card's deck; a cue is drawn only when it shares at least 1 of
 * them. null draws from the full pool (the decks that ignore genre).
 */
export function drawCard(
  type: CardType,
  pool: Pool,
  genres: readonly Genre[] | null,
  options: DrawOptions = {},
): Card {
  const random = options.random ?? Math.random;
  const createId = options.createId ?? newId;

  if (pool.type !== type) {
    throw new Error(`A ${type} card cannot be drawn from the ${pool.type} pool.`);
  }

  // 1. Keep cues that share a genre with the deck, or every cue when the deck ignores genre.
  const wanted = genres && new Set<Genre>(genres);
  const matching = wanted
    ? pool.cues.filter((cue) => cue.genres?.some((genre) => wanted.has(genre)))
    : pool.cues;

  // 2. Distinct by trimmed, lowercase text; the first cue with a text wins.
  const seen = new Set<string>();
  const distinct = matching.filter((cue) => {
    const key = cue.text.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const need = CUES_PER_CARD[type];
  if (distinct.length < need) {
    throw new Error(`The ${type} pool has ${distinct.length} distinct cues; a card needs ${need}.`);
  }

  // 3. Partial Fisher-Yates over the copy: the first `need` slots end up a uniform random pick.
  for (let i = 0; i < need; i++) {
    const j = i + Math.floor(random() * (distinct.length - i));
    [distinct[i], distinct[j]] = [distinct[j]!, distinct[i]!];
  }

  const cues = distinct.slice(0, need).map((cue): Cue => ({ text: cue.text }));

  return {
    id: createId(),
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    rings: [{ cues, activeIndex: 0 }],
  };
}
