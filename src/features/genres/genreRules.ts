/**
 * The Genres panel rules (design 9.10 and docs/mvp-plan.html "Genres panel"): the top row
 * toggles, the deck row toggles, the "each deck keeps at least 1 genre" guard, All On and
 * the count texts. Pure, no React. A rule that changes nothing returns the same object, so
 * the store's setGenres does not save; every new list is in GENRES order.
 */
import {
  allGenresOn,
  GENRE_DECKS,
  GENRES,
  type DeckGenres,
  type Genre,
  type GenreDeck,
} from '@/shared/model';

/** The list in GENRES order, with no repeats. */
export function normalize(list: readonly Genre[]): Genre[] {
  const set = new Set(list);
  return GENRES.filter((g) => set.has(g));
}

/** The union of the 4 deck lists, in GENRES order: the top row at open and the rail line. */
export function pickedGenres(genres: DeckGenres): Genre[] {
  return normalize(GENRE_DECKS.flatMap((deck) => genres[deck]));
}

function isOnly(list: readonly Genre[], genre: Genre): boolean {
  return list.length === 1 && list[0] === genre;
}

/** False when turning the genre off at the top would leave some deck with no genre. */
export function canTurnOffPicked(genres: DeckGenres, genre: Genre): boolean {
  return !GENRE_DECKS.some((deck) => isOnly(genres[deck], genre));
}

/** False when the genre is the deck's last genre. */
export function canTurnOffDeckGenre(genres: DeckGenres, deck: GenreDeck, genre: Genre): boolean {
  return !isOnly(genres[deck], genre);
}

/**
 * A top chip click. Off to on: the genre joins the top row and all 4 decks. On to off: it
 * leaves the top row and all 4 decks, unless a deck would be left empty (then nothing).
 */
export function togglePicked(
  genres: DeckGenres,
  picked: readonly Genre[],
  genre: Genre,
): { genres: DeckGenres; picked: Genre[] } {
  const on = picked.includes(genre);
  if (on && !canTurnOffPicked(genres, genre)) {
    return { genres, picked: picked as Genre[] };
  }
  const change = (list: readonly Genre[]) =>
    on ? list.filter((g) => g !== genre) : normalize([...list, genre]);
  const next = {} as DeckGenres;
  for (const deck of GENRE_DECKS) next[deck] = change(genres[deck]);
  return { genres: next, picked: change(picked) };
}

/** A deck chip click: add the genre, or remove it unless it is the deck's last genre. */
export function toggleDeckGenre(genres: DeckGenres, deck: GenreDeck, genre: Genre): DeckGenres {
  const list = genres[deck];
  if (list.includes(genre)) {
    if (!canTurnOffDeckGenre(genres, deck, genre)) return genres;
    return { ...genres, [deck]: list.filter((g) => g !== genre) };
  }
  return { ...genres, [deck]: normalize([...list, genre]) };
}

/** Every deck back to all 21 genres; the same object when that is already so. */
export function allOn(genres: DeckGenres): DeckGenres {
  const already = GENRE_DECKS.every((deck) => normalize(genres[deck]).length === GENRES.length);
  return already ? genres : allGenresOn();
}

/** The rail count line: "All genres", "1 genre" or "N genres". */
export function genreCountText(n: number): string {
  if (n >= GENRES.length) return 'All genres';
  return n === 1 ? '1 genre' : `${n} genres`;
}

/** The count pill's label: "1 genre on" or "N genres on". */
export function genresOnLabel(n: number): string {
  return n === 1 ? '1 genre on' : `${n} genres on`;
}

/** A count shows only when the deck is narrowed below all 21. */
export function showCount(n: number): boolean {
  return n < GENRES.length;
}
