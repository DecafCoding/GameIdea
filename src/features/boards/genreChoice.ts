/**
 * Choice rules for the 2-step New Board dialog (design 9.8). Step 1: the board genres, all 4
 * on at first; turning on a sub-genre (Cyberpunk, Space Opera) also turns on Sci-Fi, turning
 * one off removes only that genre, and Next needs at least 1. Step 2: 1 chip per step 1 genre
 * in each deck row, all on at first; a row keeps at least 1 chip on. Pure functions; the
 * dialog holds the state.
 */
import { CARD_TYPES, GENRES, type CardType, type DeckGenres, type Genre } from '@/shared/model';
import { NEW_BOARD_NAME } from '@/shared/store';

/** The genres that sit under Sci-Fi. */
export const SUB_GENRES: readonly Genre[] = ['cyberpunk', 'space-opera'];

/** The chosen genres after one tile changes, in GENRES order with no repeats. */
export function setGenre(chosen: readonly Genre[], genre: Genre, checked: boolean): Genre[] {
  const next = new Set(chosen);
  if (checked) {
    next.add(genre);
    if (SUB_GENRES.includes(genre)) next.add('sci-fi');
  } else {
    next.delete(genre);
  }
  return GENRES.filter((g) => next.has(g));
}

/** The dialog's choice. Deck lists are derived, so Back and Next never lose anything. */
export interface GenreChoice {
  /** Step 1: the board genres, in GENRES order. */
  genres: Genre[];
  /** Step 2: for each deck, the step 1 genres whose chip is off. Never all of genres. */
  off: Record<CardType, Genre[]>;
}

function mapDecks<T>(fn: (deck: CardType) => T): Record<CardType, T> {
  return Object.fromEntries(CARD_TYPES.map((deck) => [deck, fn(deck)])) as Record<CardType, T>;
}

/** The choice at open: all 4 genres, every chip on. */
export function initialChoice(): GenreChoice {
  return { genres: [...GENRES], off: mapDecks(() => []) };
}

/**
 * Step 1 tile change. A genre turned off loses its chips; one turned on again starts on in
 * every row; a genre that stays on keeps its state. A row left with no chip on turns all on.
 */
export function chooseGenre(choice: GenreChoice, genre: Genre, on: boolean): GenreChoice {
  const genres = setGenre(choice.genres, genre, on);
  const off = mapDecks((deck) => {
    const kept = choice.off[deck].filter((g) => genres.includes(g));
    return kept.length >= genres.length ? [] : kept;
  });
  return { genres, off };
}

/** Whether Next is on: at least 1 genre is chosen. */
export function canGoNext(choice: GenreChoice): boolean {
  return choice.genres.length > 0;
}

/** The chips of 1 deck row, in step 1 order. */
export function deckChips(choice: GenreChoice, deck: CardType): { genre: Genre; on: boolean }[] {
  return choice.genres.map((genre) => ({ genre, on: !choice.off[deck].includes(genre) }));
}

/** Step 2 chip click. Null when the chip is the row's last chip that is on (it stays on). */
export function toggleChip(choice: GenreChoice, deck: CardType, genre: Genre): GenreChoice | null {
  const current = choice.off[deck];
  const isOff = current.includes(genre);
  if (!isOff && current.length + 1 >= choice.genres.length) return null;
  const next = isOff ? current.filter((g) => g !== genre) : [...current, genre];
  return {
    genres: choice.genres,
    off: { ...choice.off, [deck]: GENRES.filter((g) => next.includes(g)) },
  };
}

/** Each deck's genres: the step 1 genres whose chip is on in its row. */
export function deckGenres(choice: GenreChoice): DeckGenres {
  return mapDecks((deck) => choice.genres.filter((g) => !choice.off[deck].includes(g)));
}

/** The board name from the field: trimmed, or "Untitled Board" when blank. */
export function boardName(draft: string): string {
  return draft.trim() || NEW_BOARD_NAME;
}
