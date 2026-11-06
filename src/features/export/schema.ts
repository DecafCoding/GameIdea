/**
 * The board file schema (validation-library in docs/architecture.html): Zod checks that an
 * imported file is a BoardRecord of the current format, with the ring rules (CLAUDE.md
 * "Rings"), unique card and note ids and no tuck cycle. Unknown keys are dropped. Typed as
 * z.ZodType<Board>, so a drift between this schema and shared/model is a type error.
 * genres: 1 list for each of the 4 genre-tagged decks, each 1 or more known genres, none
 * repeated.
 * A tuckedUnder that names no card is allowed: the stack rules treat that card as a root.
 * Card rules: a Hook Card has no rings, is never tucked and has no badge word; a Modifier
 * card needs its modDeck and only a merged adjective ring carries one; only a Modifier sits
 * on top of a card (onTopOf), never tucked, on a Player Role, Resource or Setting, 1 per
 * base card. An onTopOf that names no card is allowed, like a dangling tuckedUnder.
 * The Phase 2 fields (hook, the 6 new decks, modDeck, onTopOf, locked) went into format 1
 * before any user board existed. Format 2 adds the board kind, conceptWidth and each
 * card's inConcept; a version 1 file reaches this check through UPGRADES[1].
 * One-Pager rules: exactly 1 Hook Card, no Concept card tucked, no Hook Card in Concept, no
 * card tucked under a Concept card, a width within CONCEPT_WIDTH, and no Concept data on a
 * Free Form board. A One-Pager file with no conceptWidth is allowed (the panel's default).
 * Core Loop rules: a loop card has no rings, is never tucked, never in Details, never on top
 * of a card and has no badge word; loopText is only on a loop card, never blank and never
 * trimmed; no card is tucked under or on top of a loop card; at most 1 loop card, only on a
 * One-Pager board. A One-Pager file with no loop card is allowed (older files). The loop
 * type and loopText went into format 2 with no upgrade step (user decision 2026-11-05).
 * Questions rules: questions is only on a One-Pager board, holds 1 or more answers (the
 * last delete removes the field), each with an id and a question and answer that are never
 * blank and never trimmed; no 2 answers share an id and no question is answered twice. A
 * file with no questions field is allowed (older files). The field went into format 2
 * with no upgrade step (user decision 2026-11-05).
 */
import { z } from 'zod';
import {
  BASE_TYPES,
  BOARD_KINDS,
  CARD_TYPES,
  CONCEPT_WIDTH,
  PANEL_WIDTH,
  FORMAT_VERSION,
  GENRES,
  MOD_DECKS,
  type Board,
  type CardType,
} from '@/shared/model';

const cueSchema = z.object({
  text: z.string().trim().min(1),
});

const ringSchema = z.object({
  cues: z.array(cueSchema),
  activeIndex: z.int().nonnegative(),
  modDeck: z.enum(MOD_DECKS).optional(),
});

/** Allowed ring counts and cues per ring for each card type. */
const RING_RULES: Record<CardType, { rings: readonly number[]; cues: number }> = {
  hook: { rings: [0], cues: 0 },
  role: { rings: [1, 2], cues: 4 },
  mechanic: { rings: [1], cues: 4 },
  resource: { rings: [1, 2], cues: 4 },
  setting: { rings: [1, 2], cues: 4 },
  goal: { rings: [1], cues: 2 },
  conflict: { rings: [1], cues: 2 },
  modifier: { rings: [1], cues: 4 },
  mood: { rings: [1], cues: 4 },
  twist: { rings: [1], cues: 2 },
  progression: { rings: [1], cues: 2 },
  constraint: { rings: [1], cues: 2 },
  loop: { rings: [0], cues: 0 },
};

const isBase = (type: CardType) => BASE_TYPES.includes(type);

const cardSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(CARD_TYPES),
    x: z.number(),
    y: z.number(),
    z: z.number(),
    tuckedUnder: z.string().nullable(),
    rings: z.array(ringSchema),
    connector: z.string().min(1).optional(),
    modDeck: z.enum(MOD_DECKS).optional(),
    onTopOf: z.string().nullable(),
    locked: z.boolean(),
    inConcept: z.boolean(),
    // Never .trim(): that would rewrite the user's text. Blank text is refused instead.
    loopText: z
      .string()
      .refine((text) => text.trim() !== '', 'The Core Loop text is blank.')
      .optional(),
    width: z.number().optional(),
  })
  .superRefine((card, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const rule = RING_RULES[card.type];
    if (!rule.rings.includes(card.rings.length)) {
      issue(`A ${card.type} card has the wrong ring count.`);
      return;
    }
    card.rings.forEach((ring, i) => {
      if (ring.cues.length !== rule.cues) issue(`Ring ${i} has the wrong cue count.`);
      if (ring.activeIndex >= ring.cues.length) issue(`Ring ${i} has activeIndex out of range.`);
      // Only a merged adjective ring (rings[1] of a base card) names its Modifier deck.
      const merged = i === 1 && isBase(card.type);
      if (merged && !ring.modDeck) issue('A merged adjective ring needs its Modifier deck.');
      if (!merged && ring.modDeck) issue(`Ring ${i} of a ${card.type} card has a Modifier deck.`);
    });
    if (card.type === 'hook') {
      if (card.tuckedUnder !== null) issue('A Hook Card is never tucked.');
      if (card.connector !== undefined) issue('A Hook Card has no badge word.');
    }
    if (card.type === 'loop') {
      if (card.tuckedUnder !== null) issue('A Core Loop card is never tucked.');
      if (card.inConcept) issue('A Core Loop card is never in Details.');
      if (card.connector !== undefined) issue('A Core Loop card has no badge word.');
    } else if (card.loopText !== undefined) {
      issue(`A ${card.type} card has Core Loop text.`);
    }
    if (card.width !== undefined) {
      if (card.type !== 'loop') issue(`A ${card.type} card has a width.`);
      else if (card.width < PANEL_WIDTH.min || card.width > PANEL_WIDTH.max) {
        issue('The Core Loop width is out of range.');
      }
    }
    if (card.type === 'modifier' && !card.modDeck) issue('A Modifier card needs its deck.');
    if (card.type !== 'modifier' && card.modDeck) {
      issue(`A ${card.type} card has a Modifier deck.`);
    }
    if (card.onTopOf !== null) {
      if (card.type !== 'modifier') issue('Only a Modifier sits on top of a card.');
      if (card.tuckedUnder !== null) issue('A card on top of another is never tucked.');
    }
  });

const noteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

/** Never .trim(): that would rewrite the user's text. Blank text is refused instead. */
const answerSchema = z.object({
  id: z.string().min(1),
  question: z.string().refine((text) => text.trim() !== '', 'A question is blank.'),
  answer: z.string().refine((text) => text.trim() !== '', 'An answer is blank.'),
});

/** True when a card's tuckedUnder chain comes back to a card it has already passed. */
function hasTuckCycle(cards: readonly { id: string; tuckedUnder: string | null }[]): boolean {
  const parent = new Map(cards.map((card) => [card.id, card.tuckedUnder]));
  for (const card of cards) {
    const seen = new Set<string>();
    for (let id: string | null | undefined = card.id; id != null; id = parent.get(id)) {
      if (seen.has(id)) return true;
      seen.add(id);
    }
  }
  return false;
}

/** 1 deck's genres: 1 or more known genres, none repeated. */
const deckGenreList = z
  .array(z.enum(GENRES))
  .min(1)
  .refine((list) => new Set(list).size === list.length, 'A genre is listed twice.');

/** All 4 genre-tagged decks are required; an unknown key is dropped like any other. */
const deckGenresSchema = z.object({
  mechanic: deckGenreList,
  resource: deckGenreList,
  progression: deckGenreList,
  constraint: deckGenreList,
});

export const boardSchema: z.ZodType<Board> = z
  .object({
    formatVersion: z.literal(FORMAT_VERSION),
    id: z.string().min(1),
    name: z.string().trim().min(1),
    kind: z.enum(BOARD_KINDS),
    conceptWidth: z.number().optional(),
    conceptPos: z.object({ x: z.number(), y: z.number() }).strict().optional(),
    questionsPos: z.object({ x: z.number(), y: z.number() }).strict().optional(),
    questionsWidth: z.number().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    genres: deckGenresSchema,
    view: z.object({ panX: z.number(), panY: z.number(), zoom: z.number().positive() }),
    cards: z.array(cardSchema),
    notes: z.array(noteSchema),
    questions: z.array(answerSchema).min(1).optional(),
  })
  .superRefine((board, ctx) => {
    const cardIds = new Set(board.cards.map((card) => card.id));
    if (cardIds.size !== board.cards.length) {
      ctx.addIssue({ code: 'custom', message: 'Two cards have the same id.' });
    }
    if (new Set(board.notes.map((note) => note.id)).size !== board.notes.length) {
      ctx.addIssue({ code: 'custom', message: 'Two notes have the same id.' });
    }
    const byId = new Map(board.cards.map((card) => [card.id, card]));
    const onTopCount = new Map<string, number>();
    for (const card of board.cards) {
      if (card.onTopOf === null) continue;
      const base = byId.get(card.onTopOf);
      // An onTopOf that names no card is allowed: that card shows as a free Modifier.
      if (!base) continue;
      if (!isBase(base.type)) {
        ctx.addIssue({
          code: 'custom',
          message: 'A card sits on top of a card that is not a base.',
        });
      }
      onTopCount.set(base.id, (onTopCount.get(base.id) ?? 0) + 1);
    }
    if ([...onTopCount.values()].some((count) => count > 1)) {
      ctx.addIssue({ code: 'custom', message: 'Two cards sit on top of one card.' });
    }
    const onTopIds = new Set(
      board.cards
        .filter((card) => card.onTopOf !== null && byId.has(card.onTopOf))
        .map((c) => c.id),
    );
    if (board.cards.some((card) => card.tuckedUnder !== null && onTopIds.has(card.tuckedUnder))) {
      ctx.addIssue({ code: 'custom', message: 'A card is tucked under a card that is on top.' });
    }
    // One-Pager rules (docs/feature-one-pager-board.html Rules). A bad file is rejected,
    // never repaired, because a repair would hide data loss.
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (board.kind === 'onePager') {
      if (board.cards.filter((card) => card.type === 'hook').length !== 1) {
        issue('A One-Pager board has exactly 1 Hook Card.');
      }
    } else if (
      board.cards.some((card) => card.inConcept) ||
      board.conceptWidth !== undefined ||
      board.conceptPos !== undefined ||
      board.questionsPos !== undefined ||
      board.questionsWidth !== undefined
    ) {
      issue('Only a One-Pager board has a Details panel.');
    }
    if (board.cards.some((card) => card.inConcept && card.tuckedUnder !== null)) {
      issue('A Details card is never tucked.');
    }
    if (board.cards.some((card) => card.inConcept && card.type === 'hook')) {
      issue('A Hook Card is never in Details.');
    }
    if (
      board.cards.some(
        (card) => card.tuckedUnder !== null && byId.get(card.tuckedUnder)?.inConcept === true,
      )
    ) {
      issue('A card is tucked under a Details card.');
    }
    if (
      board.conceptWidth !== undefined &&
      (board.conceptWidth < CONCEPT_WIDTH.min || board.conceptWidth > CONCEPT_WIDTH.max)
    ) {
      issue('The Details width is out of range.');
    }
    if (
      board.questionsWidth !== undefined &&
      (board.questionsWidth < PANEL_WIDTH.min || board.questionsWidth > PANEL_WIDTH.max)
    ) {
      issue('The Questions width is out of range.');
    }
    // Core Loop rules (docs/feature-core-loop-card.html).
    const loops = board.cards.filter((card) => card.type === 'loop');
    if (loops.length > 1) issue('A board has at most 1 Core Loop card.');
    if (loops.length > 0 && board.kind !== 'onePager') {
      issue('Only a One-Pager board has a Core Loop card.');
    }
    const isLoop = (id: string | null) => id !== null && byId.get(id)?.type === 'loop';
    if (board.cards.some((card) => isLoop(card.tuckedUnder) || isLoop(card.onTopOf))) {
      issue('A card is tucked under or on top of a Core Loop card.');
    }
    // Questions rules (docs/feature-questions-panel.html Data model).
    if (board.questions !== undefined) {
      if (board.kind !== 'onePager') issue('Only a One-Pager board has questions.');
      const answers = board.questions;
      if (new Set(answers.map((item) => item.id)).size !== answers.length) {
        issue('Two answers have the same id.');
      }
      if (new Set(answers.map((item) => item.question)).size !== answers.length) {
        issue('A question is answered twice.');
      }
    }
    if (board.cards.some((card) => card.tuckedUnder === card.id)) {
      ctx.addIssue({ code: 'custom', message: 'A card is tucked under itself.' });
    } else if (hasTuckCycle(board.cards)) {
      ctx.addIssue({ code: 'custom', message: 'The tuck stacks have a cycle.' });
    }
  });
