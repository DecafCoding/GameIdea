/**
 * Fixture boards for Vitest and Playwright (test-fixtures in docs/architecture.html):
 * cards with known cue texts, small boards built from them, and the 200-card board for
 * the speed checks. Plain data with no feature imports, so the browser tests can pass a
 * board to the app through window.__GAMEIDEA_E2E_BOARD__.
 */
import {
  everyDeck,
  FORMAT_VERSION,
  GENRES,
  type Board,
  type Card,
  type CardType,
  type Cue,
  type Note,
} from '@/shared/model';

/** Distance between a tucked card and the card above it (design --tuck-offset). */
const TUCK = 59;

export const CUES = {
  character: ['navigator', 'diplomat', 'gardener', 'captain'],
  description: ['exiled', 'orbital', 'clone', 'salvage'],
  description2: ['devout', 'rogue', 'cloned', 'hollow'],
  motivation: ['wants to go home', 'wants to be believed'],
  conflict: ['but the ship is dying', 'but the fleet is gone'],
  setting: ['outpost', 'beacon', 'eclipse', 'harbor'],
} as const;

const SETTING_KINDS: Cue['kind'][] = ['place', 'object', 'event', 'place'];

function cuesFor(type: CardType): Cue[] {
  if (type === 'setting') {
    return CUES.setting.map((text, i) => ({ text, kind: SETTING_KINDS[i] }));
  }
  return CUES[type].map((text) => ({ text }));
}

/** One card of a type with the known cues, first cue active, a root at 0,0 unless overridden. */
export function fixtureCard(type: CardType, overrides: Partial<Card> = {}): Card {
  return {
    id: `${type}-1`,
    type,
    x: 0,
    y: 0,
    z: 1,
    tuckedUnder: null,
    rings: [{ cues: cuesFor(type), activeIndex: 0 }],
    ...overrides,
  };
}

/** The second Description set: devout, rogue, cloned, hollow. */
export function secondDescription(overrides: Partial<Card> = {}): Card {
  return fixtureCard('description', {
    id: 'description-2',
    rings: [{ cues: CUES.description2.map((text) => ({ text })), activeIndex: 0 }],
    ...overrides,
  });
}

/** A Character or Setting already combined with the first Description set. */
export function combinedCard(type: 'character' | 'setting', overrides: Partial<Card> = {}): Card {
  return fixtureCard(type, {
    rings: [
      { cues: cuesFor(type), activeIndex: 0 },
      { cues: cuesFor('description'), activeIndex: 0 },
    ],
    ...overrides,
  });
}

export function fixtureNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Note',
    text: '',
    x: 0,
    y: 0,
    width: 310,
    height: 160,
    ...overrides,
  };
}

export function fixtureBoard(cards: Card[], notes: Note[] = []): Board {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    formatVersion: FORMAT_VERSION,
    id: 'fixture-board',
    name: 'Fixture Board',
    createdAt: now,
    updatedAt: now,
    genres: everyDeck(GENRES),
    view: { panX: 0, panY: 0, zoom: 1 },
    cards,
    notes,
  };
}

/**
 * A chain stack at x, y: a Character with a Motivation tucked under it and a Conflict
 * tucked under the Motivation, each 59 px lower. Ids get the suffix.
 */
export function fixtureStack(x: number, y: number, suffix = '1', z = 1): Card[] {
  const character = fixtureCard('character', { id: `character-${suffix}`, x, y, z });
  const motivation = fixtureCard('motivation', {
    id: `motivation-${suffix}`,
    x,
    y: y + TUCK,
    z: z + 1,
    tuckedUnder: character.id,
  });
  const conflict = fixtureCard('conflict', {
    id: `conflict-${suffix}`,
    x,
    y: y + 2 * TUCK,
    z: z + 2,
    tuckedUnder: motivation.id,
  });
  return [character, motivation, conflict];
}

/** A 250 px card plus a gap of more than the 24 px margin, on the 24 px grid. */
const PITCH = 288;
const COLUMNS = 20;
const TYPES: CardType[] = ['character', 'motivation', 'setting', 'conflict', 'description'];

/**
 * The 200-card board: 140 single cards on 7 rows of 20 at a 288 px pitch, cycling the
 * 5 types (the first 20 Characters combined), and 20 stacks of 3 on the 8th row, so the
 * speed checks include tucked cards. No notes.
 */
export function board200(): Board {
  const cards: Card[] = [];
  let z = 1;
  let combined = 0;
  for (let i = 0; i < 140; i++) {
    const type = TYPES[i % TYPES.length]!;
    const position = {
      id: `card-${i}`,
      x: (i % COLUMNS) * PITCH,
      y: Math.floor(i / COLUMNS) * PITCH,
      z: z++,
    };
    if (type === 'character' && combined < 20) {
      combined++;
      cards.push(combinedCard('character', position));
    } else {
      cards.push(fixtureCard(type, position));
    }
  }
  for (let column = 0; column < COLUMNS; column++) {
    cards.push(...fixtureStack(column * PITCH, 7 * PITCH, `stack-${column}`, z));
    z += 3;
  }
  return { ...fixtureBoard(cards), id: 'board-200', name: 'Board 200' };
}
