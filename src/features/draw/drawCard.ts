/**
 * Draw logic: builds one new card of a deck from its pool, with distinct cues. For a
 * genre-tagged deck, only cues that share a genre with the deck's genres on the board are
 * drawn; a Modifier deck draws only cues whose targets include it; every other deck draws
 * from its full pool (CLAUDE.md "Draws"). Cards copy only cue text, never genres or targets.
 * Used by the deck buttons, Redraw, Redraw All and Deal Stack; the caller places the
 * returned card. A draw may exclude cue keys (Deal Stack passes the cues already on the
 * board for that deck); when too few cues are left, the whole exclusion is dropped for
 * that card and it draws from the filtered pool.
 */
import {
  CUES_PER_CARD,
  GENRE_DECKS,
  newId,
  type Card,
  type Cue,
  type Deck,
  type DeckGenres,
  type Genre,
  type GenreDeck,
  type ModDeck,
  type Pool,
  type Pools,
} from '@/shared/model';

/** What narrows a draw: the deck's genres (genre-tagged decks) or the Modifier deck. */
export interface DrawFilter {
  genres?: readonly Genre[];
  modDeck?: ModDeck;
}

const isGenreDeck = (type: Deck): type is GenreDeck =>
  (GENRE_DECKS as readonly string[]).includes(type);

export interface DrawOptions {
  /** Returns a number in [0, 1). Defaults to Math.random. */
  random?: () => number;
  /** Returns a new card id. Defaults to newId. */
  createId?: () => string;
  /** Cue keys (see cueKey) not to draw. Dropped as a whole when too few cues are left. */
  excluded?: ReadonlySet<string>;
}

/** The distinct-cue key: trimmed, lowercase text. */
export function cueKey(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Draws one card: one ring of distinct cues (4 or 2 by deck), first cue active, at 0,0,
 * unlocked and not on top of a card.
 * A genre-tagged deck needs filter.genres; a cue is drawn only when it shares 1 of them.
 * The Modifier deck needs filter.modDeck; a cue is drawn only when its targets include it,
 * and the card gets that modDeck. Every other deck draws from the full pool.
 */
export function drawCard(
  type: Deck,
  pool: Pool,
  filter: DrawFilter = {},
  options: DrawOptions = {},
): Card {
  const random = options.random ?? Math.random;
  const createId = options.createId ?? newId;

  if (pool.type !== type) {
    throw new Error(`A ${type} card cannot be drawn from the ${pool.type} pool.`);
  }

  // 1. Keep cues that share a genre with the deck, or that target the Modifier deck, or
  // every cue for the decks that use neither filter.
  let matching = pool.cues;
  if (isGenreDeck(type)) {
    if (!filter.genres) throw new Error(`A ${type} draw needs the deck's genres.`);
    const wanted = new Set<Genre>(filter.genres);
    matching = matching.filter((cue) => cue.genres?.some((genre) => wanted.has(genre)));
  }
  const modDeck = filter.modDeck;
  if (type === 'modifier') {
    if (!modDeck) throw new Error('A Modifier draw needs its Modifier deck.');
    matching = matching.filter((cue) => cue.targets?.includes(modDeck));
  }

  // 2. Distinct by trimmed, lowercase text; the first cue with a text wins.
  const seen = new Set<string>();
  const distinct = matching.filter((cue) => {
    const key = cueKey(cue.text);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const need = CUES_PER_CARD[type];
  if (distinct.length < need) {
    throw new Error(`The ${type} pool has ${distinct.length} distinct cues; a card needs ${need}.`);
  }

  // 3. Drop excluded cues, unless too few are left: then the whole exclusion is dropped.
  const excluded = options.excluded;
  const open = excluded ? distinct.filter((cue) => !excluded.has(cueKey(cue.text))) : distinct;
  const from = open.length >= need ? open : distinct;

  // 4. Partial Fisher-Yates over the copy: the first `need` slots end up a uniform random pick.
  for (let i = 0; i < need; i++) {
    const j = i + Math.floor(random() * (from.length - i));
    [from[i], from[j]] = [from[j]!, from[i]!];
  }

  const cues = from.slice(0, need).map((cue): Cue => ({ text: cue.text }));

  return {
    id: createId(),
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    rings: [{ cues, activeIndex: 0 }],
    ...(type === 'modifier' ? { modDeck } : {}),
    onTopOf: null,
    locked: false,
    inConcept: false,
  };
}

/**
 * Draws a card like the given one: the same deck, the same Modifier deck, and the board's
 * genres for a genre-tagged deck. Used by Redraw and Redraw All, and by Deal Stack with
 * only a deck ({ type }), which draws as that deck's rail button does.
 */
export function drawFor(
  card: Pick<Card, 'type' | 'modDeck'>,
  pools: Pools,
  genres: DeckGenres,
  options: DrawOptions = {},
): Card {
  if (card.type === 'hook') throw new Error('A Hook Card is never drawn from a pool.');
  if (card.type === 'loop') throw new Error('A Core Loop card is never drawn from a pool.');
  const type = card.type;
  const filter: DrawFilter = isGenreDeck(type)
    ? { genres: genres[type] }
    : type === 'modifier'
      ? { modDeck: card.modDeck ?? 'role' }
      : {};
  return drawCard(type, pools[type], filter, options);
}
