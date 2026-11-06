/**
 * Fixture boards for Vitest and Playwright (test-fixtures in docs/architecture.html):
 * cards with known cue texts, small boards built from them, and the 200-card board for
 * the speed checks. Plain data with no feature imports, so the browser tests can pass a
 * board to the app through window.__GAMEIDEA_E2E_BOARD__.
 */
import {
  allGenresOn,
  FORMAT_VERSION,
  type Board,
  type Card,
  type CardType,
  type Cue,
  type Note,
} from '@/shared/model';

/** Distance between a tucked card and the card above it (design --tuck-offset). */
export const TUCK = 56;

export const CUES = {
  role: ['navigator', 'diplomat', 'gardener', 'captain'],
  modifier: ['exiled', 'orbital', 'clone', 'salvage'],
  modifier2: ['devout', 'rogue', 'cloned', 'hollow'],
  goal: ['keep the light on', 'map the lost caves'],
  conflict: ['the tide rises every night', 'the map keeps changing'],
  setting: ['outpost', 'beacon', 'eclipse', 'harbor'],
  mechanic: ['trade', 'climb', 'hide', 'build'],
  resource: ['memories', 'lamp oil', 'rope', 'favors'],
  mood: ['tense', 'cozy', 'eerie', 'giddy'],
  twist: ['the map is alive', 'your guide lies'],
  progression: ['new islands open', 'tools get sharper'],
  constraint: ['no jumping', 'only one hand'],
  hook: [],
  loop: [],
} as const;

function cuesFor(type: CardType): Cue[] {
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
    rings: type === 'hook' || type === 'loop' ? [] : [{ cues: cuesFor(type), activeIndex: 0 }],
    ...(type === 'modifier' ? { modDeck: 'role' as const } : {}),
    onTopOf: null,
    locked: false,
    inConcept: false,
    ...overrides,
  };
}

/** The second Modifier set: devout, rogue, cloned, hollow. */
export function secondModifier(overrides: Partial<Card> = {}): Card {
  return fixtureCard('modifier', {
    id: 'modifier-2',
    rings: [{ cues: CUES.modifier2.map((text) => ({ text })), activeIndex: 0 }],
    ...overrides,
  });
}

/** A Player Role or Setting already combined with the first Modifier set (role deck). */
export function combinedCard(type: 'role' | 'setting', overrides: Partial<Card> = {}): Card {
  return fixtureCard(type, {
    rings: [
      { cues: cuesFor(type), activeIndex: 0 },
      { cues: cuesFor('modifier'), activeIndex: 0, modDeck: 'role' },
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
    kind: 'free',
    createdAt: now,
    updatedAt: now,
    genres: allGenresOn(),
    view: { panX: 0, panY: 0, zoom: 1 },
    cards,
    notes,
  };
}

/**
 * A chain stack at x, y: a Player Role with a Goal tucked under it and a Conflict
 * tucked under the Goal, each 56 px lower. Ids get the suffix.
 */
export function fixtureStack(x: number, y: number, suffix = '1', z = 1): Card[] {
  const role = fixtureCard('role', { id: `role-${suffix}`, x, y, z });
  const goal = fixtureCard('goal', {
    id: `goal-${suffix}`,
    x,
    y: y + TUCK,
    z: z + 1,
    tuckedUnder: role.id,
  });
  const conflict = fixtureCard('conflict', {
    id: `conflict-${suffix}`,
    x,
    y: y + 2 * TUCK,
    z: z + 2,
    tuckedUnder: goal.id,
  });
  return [role, goal, conflict];
}

/** A 200 px card plus a gap of more than the 24 px margin, on the 24 px grid. */
const PITCH = 240;
const COLUMNS = 20;
const TYPES: CardType[] = ['role', 'goal', 'setting', 'conflict', 'modifier'];

/**
 * The 200-card board: 140 single cards on 7 rows of 20 at a 240 px pitch, cycling the
 * 5 types (the first 20 Player Roles combined), and 20 stacks of 3 on the 8th row, so the
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
    if (type === 'role' && combined < 20) {
      combined++;
      cards.push(combinedCard('role', position));
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

/** Stack cards sit this far in from a Hook Card root's left edge (design 9.5). */
export const HOOK_INSET = 20;

/**
 * The long-stack fixture (test-data in docs/architecture.html): one chain of 11 cards,
 * long-0 to long-10, each tucked under the one before, for the 11-card stack drag test.
 * long-0 is a Hook Card; the 10 cards under it cycle 5 decks and sit 20 px in from its
 * left edge. Modifiers sit tucked, never combined, because only a drop combines.
 */
export function stack11Board(): Board {
  const cycle: CardType[] = ['role', 'goal', 'conflict', 'setting', 'modifier'];
  const cards: Card[] = [fixtureCard('hook', { id: 'long-0', x: 240, y: 48, z: 1 })];
  for (let i = 1; i < 11; i++) {
    const type = cycle[(i - 1) % cycle.length]!;
    cards.push(
      fixtureCard(type, {
        id: `long-${i}`,
        x: 240 + HOOK_INSET,
        y: 48 + i * TUCK,
        z: i + 1,
        tuckedUnder: `long-${i - 1}`,
      }),
    );
  }
  return {
    ...fixtureBoard(cards),
    id: 'board-long-stack',
    name: 'Long Stack',
    view: { panX: 0, panY: 0, zoom: 0.75 },
  };
}

/**
 * The round-trip fixture: every card feature on one board, for the board file round trip.
 * A Hook Card stack with all 11 deck types (a tucked Modifier among them), a combined
 * Player Role with a merged ring and an On Top Modifier, a combined Setting that can be
 * Split, a locked card, a saved connector word, turned rings, 2 notes with titles and
 * multi-line text, narrowed genres on 2 decks and a non-default view.
 */
export function roundTripBoard(): Board {
  const x = 240 + HOOK_INSET;
  const chain: CardType[] = [
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
  ];
  const cards: Card[] = [fixtureCard('hook', { id: 'rt-hook', x: 240, y: 48, z: 1 })];
  chain.forEach((type, i) => {
    const position = {
      id: `rt-${type}`,
      x,
      y: 48 + (i + 1) * TUCK,
      z: i + 2,
      tuckedUnder: i === 0 ? 'rt-hook' : `rt-${chain[i - 1]}`,
    };
    if (type === 'role') {
      cards.push(
        combinedCard('role', {
          ...position,
          rings: [
            { cues: cuesFor('role'), activeIndex: 2 },
            { cues: cuesFor('modifier'), activeIndex: 1, modDeck: 'role' },
          ],
        }),
      );
    } else if (type === 'setting') {
      cards.push(
        fixtureCard('setting', {
          ...position,
          rings: [
            { cues: cuesFor('setting'), activeIndex: 3 },
            { cues: CUES.modifier2.map((text) => ({ text })), activeIndex: 0, modDeck: 'setting' },
          ],
        }),
      );
    } else if (type === 'modifier') {
      cards.push(fixtureCard('modifier', { ...position, modDeck: 'resource' }));
    } else if (type === 'mechanic') {
      cards.push(
        fixtureCard('mechanic', { ...position, connector: 'who learns to', locked: true }),
      );
    } else if (type === 'goal') {
      cards.push(
        fixtureCard('goal', { ...position, rings: [{ cues: cuesFor('goal'), activeIndex: 1 }] }),
      );
    } else {
      cards.push(fixtureCard(type, position));
    }
  });
  cards.push(secondModifier({ id: 'rt-on-top', x: 900, y: 900, z: 20, onTopOf: 'rt-role' }));
  const notes = [
    fixtureNote({ id: 'rt-note-1', title: 'Pitch', text: 'Line one.\nLine two.', x: 720, y: 48 }),
    fixtureNote({
      id: 'rt-note-2',
      title: 'Open Questions',
      text: 'Who built the lighthouse?\n\nWhy now?',
      x: 720,
      y: 288,
      width: 360,
      height: 220,
    }),
  ];
  return {
    ...fixtureBoard(cards, notes),
    id: 'round-trip',
    name: 'Round Trip',
    createdAt: '2026-02-03T04:05:06.000Z',
    updatedAt: '2026-03-04T05:06:07.000Z',
    genres: { ...allGenresOn(), mechanic: ['horror', 'puzzle'], constraint: ['roguelike'] },
    view: { panX: -120, panY: 64, zoom: 0.8 },
  };
}

/**
 * A plain-JSON version 1 board file, as a build before format version 2 wrote it: the
 * round-trip board with formatVersion 1, no kind and no inConcept on any card. The import
 * tests, the Dexie upgrade test and Playwright share it.
 */
export function version1BoardFile(): Record<string, unknown> {
  const file = JSON.parse(JSON.stringify(roundTripBoard())) as Record<string, unknown>;
  file.formatVersion = 1;
  delete file.kind;
  for (const card of file.cards as Record<string, unknown>[]) delete card.inConcept;
  return file;
}

/**
 * The One-Pager fixture: a Hook Card hook-1 at (96, 96) with a Player Role and a Mechanic
 * tucked under it, and Concept chips: 2 Resources (resource-c1 "memories", resource-c2
 * "rope", z ascending), 1 plain Setting (setting-c1) and 1 Mechanic (mechanic-c1). Plus 1
 * loose role Modifier (modifier-1) and 1 note, both right of the panel and in view at zoom 1.
 */
export function onePagerBoard(): Board {
  const hook = fixtureCard('hook', { id: 'hook-1', x: 96, y: 96, z: 1 });
  const role = fixtureCard('role', {
    id: 'role-t1',
    x: 96 + HOOK_INSET,
    y: 96 + TUCK,
    z: 2,
    tuckedUnder: hook.id,
  });
  const mechanic = fixtureCard('mechanic', {
    id: 'mechanic-t1',
    x: 96 + HOOK_INSET,
    y: 96 + 2 * TUCK,
    z: 3,
    tuckedUnder: role.id,
  });
  const chip = (type: CardType, id: string, z: number, activeIndex = 0): Card =>
    fixtureCard(type, {
      id,
      z,
      inConcept: true,
      rings: [{ cues: cuesFor(type), activeIndex }],
    });
  const cards: Card[] = [
    hook,
    role,
    mechanic,
    chip('resource', 'resource-c1', 4, 0),
    chip('resource', 'resource-c2', 5, 2),
    chip('setting', 'setting-c1', 6),
    chip('mechanic', 'mechanic-c1', 7, 1),
    fixtureCard('modifier', { id: 'modifier-1', x: 720, y: 360, z: 8 }),
  ];
  return {
    ...fixtureBoard(cards, [fixtureNote({ x: 720, y: 96 })]),
    id: 'one-pager',
    name: 'One Pager',
    kind: 'onePager',
    conceptWidth: 232,
  };
}

/**
 * The One-Pager fixture plus its Core Loop card loop-1 at (624, 96), z 9, with no loopText.
 * Its live loop text is "trade → earn memories": the train Mechanic, then the first Resource
 * chip by z; there is no Progression or Goal.
 */
export function onePagerWithLoop(): Board {
  const board = onePagerBoard();
  return {
    ...board,
    cards: [...board.cards, fixtureCard('loop', { id: 'loop-1', x: 624, y: 96, z: 9 })],
  };
}

/**
 * The Core Loop fixture with 2 answers, newest first: answer-2 "What makes it fun?" and
 * answer-1 "Who is the player?" (texts from the browser fixture question pool). modifier-1
 * moves to x 960, out of the Questions panel's area below the Core Loop card.
 */
export function onePagerWithAnswers(): Board {
  const board = onePagerWithLoop();
  return {
    ...board,
    cards: board.cards.map((card) => (card.id === 'modifier-1' ? { ...card, x: 960 } : card)),
    // Dragged up a little, so the whole answer list stays clear of the zoom strip.
    questionsPos: { x: 624, y: 312 },
    questions: [
      { id: 'answer-2', question: 'What makes it fun?', answer: 'Chasing the light.' },
      { id: 'answer-1', question: 'Who is the player?', answer: 'A night owl.' },
    ],
  };
}
