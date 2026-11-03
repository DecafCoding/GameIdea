/**
 * Shared model types: boards, cards with rings, cues, notes, pools and genres.
 * Types and constants, plus allGenresOn and newId, no other logic. See docs/architecture.html (schema-shape)
 * and docs/feature-dual-ring-cards.html for the ring rules.
 */

/**
 * Board file and record format version. A shape change needs an upgrade step.
 * Phase 2 added hook, 6 decks, modDeck, onTopOf and locked inside version 1 before any
 * user board existed; from Phase 2 on, a shape change needs an upgrade step.
 */
export const FORMAT_VERSION = 1;

/**
 * The 11 decks, in rail order: the core decks in design order, the Modifier deck, then
 * the optional decks.
 */
export const DECKS = [
  'role',
  'mechanic',
  'resource',
  'goal',
  'conflict',
  'modifier',
  'setting',
  'mood',
  'twist',
  'progression',
  'constraint',
] as const;
export type Deck = (typeof DECKS)[number];

/** The 12 card types: the Hook Card, which no deck draws, and the 11 decks. */
export const CARD_TYPES = ['hook', ...DECKS] as const;
export type CardType = (typeof CARD_TYPES)[number];

/** The 3 Modifier decks, named by the card type their adjectives target. */
export const MOD_DECKS = ['role', 'resource', 'setting'] as const;
export type ModDeck = (typeof MOD_DECKS)[number];

/** The card types a Modifier combines with (the same 3 as the Modifier decks). */
export const BASE_TYPES: readonly CardType[] = MOD_DECKS;

/**
 * The 21 genres, in docs/libraries/genres.json order: each name lowercased, "&" dropped and
 * every run of spaces and punctuation made one "-" ("Builder & Management" is
 * builder-management). genres.test.ts pins the list to the file.
 */
export const GENRES = [
  'roguelike',
  'metroidvania',
  'platformer',
  'puzzle',
  'shooter',
  'melee-action',
  'fighting',
  'rpg',
  'open-world',
  'survival-craft',
  'horror',
  'builder-management',
  'life-sim',
  'vehicle-sim-racing',
  'strategy',
  'deckbuilder-cards',
  'narrative',
  'stealth-immersive-sim',
  'sandbox',
  'party-multiplayer',
  'rhythm-arcade',
] as const;
export type Genre = (typeof GENRES)[number];

/** Genre display names, the keys of docs/libraries/genres.json. */
export const GENRE_NAME: Record<Genre, string> = {
  roguelike: 'Roguelike',
  metroidvania: 'Metroidvania',
  platformer: 'Platformer',
  puzzle: 'Puzzle',
  shooter: 'Shooter',
  'melee-action': 'Melee Action',
  fighting: 'Fighting',
  rpg: 'RPG',
  'open-world': 'Open World',
  'survival-craft': 'Survival Craft',
  horror: 'Horror',
  'builder-management': 'Builder & Management',
  'life-sim': 'Life Sim',
  'vehicle-sim-racing': 'Vehicle Sim & Racing',
  strategy: 'Strategy',
  'deckbuilder-cards': 'Deckbuilder & Cards',
  narrative: 'Narrative',
  'stealth-immersive-sim': 'Stealth & Immersive Sim',
  sandbox: 'Sandbox',
  'party-multiplayer': 'Party & Multiplayer',
  'rhythm-arcade': 'Rhythm & Arcade',
};

/** The 4 genre-tagged decks. Their cues carry genres; every other deck ignores genre. */
export const GENRE_DECKS = ['mechanic', 'resource', 'progression', 'constraint'] as const;
export type GenreDeck = (typeof GENRE_DECKS)[number];

/** 1 genre list for each genre-tagged deck. Each list has 1 or more genres, no repeats. */
export type DeckGenres = Record<GenreDeck, Genre[]>;

/** Every genre on in every genre-tagged deck: the genres of a new board. */
export function allGenresOn(): DeckGenres {
  return {
    mechanic: [...GENRES],
    resource: [...GENRES],
    progression: [...GENRES],
    constraint: [...GENRES],
  };
}

/** Cues on one ring at draw time: 4 cues, nouns or adjectives, or 2 cues. */
export const CUES_PER_CARD: Record<Deck, 2 | 4> = {
  role: 4,
  mechanic: 4,
  resource: 4,
  goal: 2,
  conflict: 2,
  modifier: 4,
  setting: 4,
  mood: 4,
  twist: 2,
  progression: 2,
  constraint: 2,
};

/** The deck name shown on deck buttons, cards and in the text file. */
export const DECK_NAME: Record<CardType, string> = {
  hook: 'Hook Card',
  role: 'Player Role',
  mechanic: 'Mechanic',
  resource: 'Resource',
  goal: 'Goal',
  conflict: 'Conflict',
  modifier: 'Modifier',
  setting: 'Setting',
  mood: 'Mood',
  twist: 'Twist',
  progression: 'Progression',
  constraint: 'Constraint',
};

/** The name of each Modifier deck, on its button, its cards and in the text file. */
export const MOD_DECK_NAME: Record<ModDeck, string> = {
  role: 'Player Role Modifier',
  resource: 'Resource Modifier',
  setting: 'Setting Modifier',
};

/** A cue copied onto a card. */
export interface Cue {
  text: string;
}

/** activeIndex is the cue at the bottom edge. */
export interface Ring {
  cues: Cue[];
  activeIndex: number;
  /**
   * The Modifier deck a merged adjective ring came from. Only on rings[1] of a combined
   * Player Role, Resource or Setting card; it brings the right icon back on a Split.
   */
  modDeck?: ModDeck;
}

export interface Card {
  id: string;
  type: CardType;
  x: number;
  y: number;
  z: number;
  tuckedUnder: string | null;
  /**
   * Player Role, Resource, Setting: [nouns] or [nouns, adjectives]. A Hook Card: none.
   * Every other deck: one ring.
   */
  rings: Ring[];
  /** The Modifier deck a modifier card was drawn from. Required on a modifier card only. */
  modDeck?: ModDeck;
  /**
   * The base card (Player Role, Resource or Setting with a merged ring) this Modifier sits
   * on top of, or null. An on-top card is never tucked and has no place of its own.
   */
  onTopOf: string | null;
  /** A locked card keeps its cues when Redraw All runs. */
  locked: boolean;
  /**
   * The connector word chosen on the badge above this card while it was tucked, such as
   * "aboard the". Shown only while it fits the pair; otherwise the pair's default shows.
   * Absent until the user picks one.
   */
  connector?: string;
}

export interface Note {
  id: string;
  /** The header line. New notes start as "Note". */
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
  /**
   * The genres of the 4 genre-tagged decks, all on for a new board. A draw from one of
   * those decks uses only cues sharing 1 of its genres.
   */
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
  /** Genre-tagged decks only: 1 or more; a cue in 2 genres is stored once. */
  genres?: Genre[];
  /** Modifier cues only: the Modifier decks that draw this cue. Cards never copy it. */
  targets?: ModDeck[];
}

export interface Pool {
  type: Deck;
  cues: PoolCue[];
}

export type Pools = Record<Deck, Pool>;

export { newId } from './newId';
