/**
 * The board file schema (validation-library in docs/architecture.html): Zod checks that an
 * imported file is a BoardRecord of the current format, with the ring rules (CLAUDE.md
 * "Rings"), unique card and note ids and no tuck cycle. Unknown keys are dropped. Typed as
 * z.ZodType<Board>, so a drift between this schema and shared/model is a type error.
 * genres: 1 list for each of the 5 decks, each 1 or more known genres, none repeated
 * (version 3 and up).
 * A tuckedUnder that names no card is allowed: the stack rules treat that card as a root.
 */
import { z } from 'zod';
import { CARD_TYPES, FORMAT_VERSION, GENRES, type Board, type CardType } from '@/shared/model';

const cueSchema = z.object({
  text: z.string().trim().min(1),
  kind: z.enum(['place', 'object', 'event']).optional(),
});

const ringSchema = z.object({
  cues: z.array(cueSchema),
  activeIndex: z.int().nonnegative(),
});

/** Allowed ring counts and cues per ring for each card type. */
const RING_RULES: Record<CardType, { rings: readonly number[]; cues: number }> = {
  role: { rings: [1, 2], cues: 4 },
  setting: { rings: [1, 2], cues: 4 },
  goal: { rings: [1], cues: 2 },
  conflict: { rings: [1], cues: 2 },
  modifier: { rings: [1], cues: 4 },
};

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
  })
  .superRefine((card, ctx) => {
    const rule = RING_RULES[card.type];
    if (!rule.rings.includes(card.rings.length)) {
      ctx.addIssue({ code: 'custom', message: `A ${card.type} card has the wrong ring count.` });
      return;
    }
    card.rings.forEach((ring, i) => {
      if (ring.cues.length !== rule.cues) {
        ctx.addIssue({ code: 'custom', message: `Ring ${i} has the wrong cue count.` });
      }
      if (ring.activeIndex >= ring.cues.length) {
        ctx.addIssue({ code: 'custom', message: `Ring ${i} has activeIndex out of range.` });
      }
      const kindAllowed = card.type === 'setting' && i === 0;
      if (!kindAllowed && ring.cues.some((cue) => cue.kind !== undefined)) {
        ctx.addIssue({ code: 'custom', message: `Ring ${i} has a kind it may not have.` });
      }
    });
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

/** All 5 decks are required; an unknown key is dropped like any other. */
const deckGenresSchema = z.object({
  role: deckGenreList,
  goal: deckGenreList,
  setting: deckGenreList,
  conflict: deckGenreList,
  modifier: deckGenreList,
});

export const boardSchema: z.ZodType<Board> = z
  .object({
    formatVersion: z.literal(FORMAT_VERSION),
    id: z.string().min(1),
    name: z.string().trim().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    genres: deckGenresSchema,
    view: z.object({ panX: z.number(), panY: z.number(), zoom: z.number().positive() }),
    cards: z.array(cardSchema),
    notes: z.array(noteSchema),
  })
  .superRefine((board, ctx) => {
    const cardIds = new Set(board.cards.map((card) => card.id));
    if (cardIds.size !== board.cards.length) {
      ctx.addIssue({ code: 'custom', message: 'Two cards have the same id.' });
    }
    if (new Set(board.notes.map((note) => note.id)).size !== board.notes.length) {
      ctx.addIssue({ code: 'custom', message: 'Two notes have the same id.' });
    }
    if (board.cards.some((card) => card.tuckedUnder === card.id)) {
      ctx.addIssue({ code: 'custom', message: 'A card is tucked under itself.' });
    } else if (hasTuckCycle(board.cards)) {
      ctx.addIssue({ code: 'custom', message: 'The tuck stacks have a cycle.' });
    }
  });
