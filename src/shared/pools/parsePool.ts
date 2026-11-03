/**
 * Pool file parsing: a hand-written type guard that turns fetched JSON into a Pool.
 * Zod is reserved for features/export/, so the pool shape is checked by hand here.
 * A cue of a genre-tagged deck (GENRE_DECKS) needs a genres list: 1 or more known genres,
 * none repeated. A cue of any other deck must have no genres key.
 */
import {
  GENRE_DECKS,
  GENRES,
  type Deck,
  type Genre,
  type Pool,
  type PoolCue,
} from '@/shared/model';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** A non-empty array of known genres with no repeats. */
const isGenreList = (value: unknown): value is Genre[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((genre) => GENRES.includes(genre as Genre)) &&
  new Set(value).size === value.length;

/** Checks one pool file body for a type and returns a fresh Pool; throws on any broken rule. */
export function parsePool(type: Deck, data: unknown): Pool {
  if (!isRecord(data)) {
    throw new Error(`The ${type} pool file is not a JSON object.`);
  }
  if (data.type !== type) {
    throw new Error(`The ${type} pool file says its type is ${String(data.type)}.`);
  }
  if (!Array.isArray(data.cues) || data.cues.length === 0) {
    throw new Error(`The ${type} pool file has no cues.`);
  }

  const tagged = (GENRE_DECKS as readonly string[]).includes(type);
  const cues = data.cues.map((raw: unknown, index): PoolCue => {
    if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.text)) {
      throw new Error(`Cue ${index} in the ${type} pool needs an id and a text.`);
    }
    if (!tagged) {
      if (raw.genres !== undefined) {
        throw new Error(`Cue ${raw.id} in the ${type} pool must not have genres.`);
      }
      // Any other key on a cue is ignored, not copied.
      return { id: raw.id, text: raw.text };
    }
    if (!isGenreList(raw.genres)) {
      throw new Error(`Cue ${raw.id} in the ${type} pool needs a list of known genres.`);
    }
    return { id: raw.id, text: raw.text, genres: [...raw.genres] };
  });

  return { type, cues };
}
