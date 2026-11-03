/**
 * Shared model types: boards, cards with rings, cues, notes, pools and genres.
 * Types and constants, plus everyDeck and newId, no other logic. See docs/architecture.html (schema-shape)
 * and docs/feature-dual-ring-cards.html for the ring rules.
 */

/** Board file and record format version. A shape change needs an upgrade step. */
export const FORMAT_VERSION = 5;

/** The 5 decks, in rail order: core, then modifiers, then optional. */
export const CARD_TYPES = ['role', 'goal', 'conflict', 'modifier', 'setting'] as const;
export type CardType = (typeof CARD_TYPES)[number];

/** The 4 genres, in dialog order. Cyberpunk and Space Opera are sub-genres of Sci-Fi. */
export const GENRES = ['generic', 'sci-fi', 'cyberpunk', 'space-opera'] as const;
export type Genre = (typeof GENRES)[number];

/** 1 genre list for each deck. Each list has 1 or more genres, in GENRES order, no repeats. */
export type DeckGenres = Record<CardType, Genre[]>;

/** The same list copied into every deck: the default for a new board and the upgrade from version 2. */
export function everyDeck(genres: readonly Genre[]): DeckGenres {
  return {
    role: [...genres],
    goal: [...genres],
    setting: [...genres],
    conflict: [...genres],
    modifier: [...genres],
  };
}

/** Cues on one ring at draw time: 4 nouns / 2 cues / 4 adjectives. */
export const CUES_PER_CARD: Record<CardType, 2 | 4> = {
  role: 4,
  goal: 2,
  conflict: 2,
  modifier: 4,
  setting: 4,
};

/** The deck name shown on deck buttons, cards and in the text file. */
export const DECK_NAME: Record<CardType, string> = {
  role: 'Player Role',
  goal: 'Goal',
  conflict: 'Conflict',
  modifier: 'Modifier',
  setting: 'Setting',
};

/** A cue copied onto a card. */
export interface Cue {
  text: string;
}

/** activeIndex is the cue at the bottom edge. */
export interface Ring {
  cues: Cue[];
  activeIndex: number;
}

export interface Card {
  id: string;
  type: CardType;
  x: number;
  y: number;
  z: number;
  tuckedUnder: string | null;
  /** Player Role/Setting: [nouns] or [nouns, adjectives]. Others: one ring. */
  rings: Ring[];
  /**
   * The connector word chosen on the badge above this card while it was tucked, such as
   * "aboard the". Shown only while it fits the pair; otherwise the pair's default shows.
   * Absent until the writer picks one. Added in format version 5.
   */
  connector?: string;
}

export interface Note {
  id: string;
  /** The header line. New notes start as "Note". Added in format version 4. */
  title: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardView {
  panX: number;
  panY: number;
  zoom: number;
}

/** One saved board: the IndexedDB record and the board file body. Timestamps are ISO 8601. */
export interface Board {
  formatVersion: typeof FORMAT_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Set at creation, never changed. A draw from a deck uses only cues sharing 1 of that deck's genres. */
  genres: DeckGenres;
  view: BoardView;
  cards: Card[];
  notes: Note[];
}

export type BoardRecord = Board;

/** One row of the board list. */
export interface BoardIndexRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** A cue as it sits in a pool file. */
export interface PoolCue {
  id: string;
  text: string;
  /** 1 or more; a cue in 2 genres is stored once. */
  genres: Genre[];
}

export interface Pool {
  type: CardType;
  cues: PoolCue[];
}

export type Pools = Record<CardType, Pool>;

export { newId } from './newId';
