/**
 * Tests for the board file schema: every fixture passes unchanged, and each rule rejects
 * its bad case.
 */
import { describe, expect, it } from 'vitest';
import {
  CARD_TYPES,
  everyDeck,
  FORMAT_VERSION,
  GENRES,
  type Board,
  type Card,
  type DeckGenres,
} from '@/shared/model';
import {
  board200,
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
} from '@/test/fixtures/boards';
import { boardSchema } from './schema';

function mixedBoard(): Board {
  return fixtureBoard(
    [
      ...CARD_TYPES.map((type, i) => fixtureCard(type, { id: `${type}-x`, x: i * 300 })),
      combinedCard('setting', { id: 'setting-combined' }),
      ...fixtureStack(0, 600),
    ],
    [fixtureNote({ text: 'A note.' }), fixtureNote({ id: 'note-2' })],
  );
}

/** A board whose first card is replaced with the given overrides. */
function withCard(overrides: Partial<Card>, base: Card = fixtureCard('role')): unknown {
  return fixtureBoard([{ ...base, ...overrides }]);
}

const rejects = (value: unknown) => expect(boardSchema.safeParse(value).success).toBe(false);

describe('boardSchema', () => {
  it('boardSchema_fixtureBoards_pass', () => {
    for (const board of [mixedBoard(), board200(), fixtureBoard([])]) {
      const result = boardSchema.safeParse(board);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(board);
    }
  });

  it('boardSchema_unknownKeys_stripped', () => {
    const board = fixtureBoard([fixtureCard('goal')]);
    const extra = { ...board, extra: 1, cards: [{ ...board.cards[0], glow: true }] };
    expect(boardSchema.parse(extra)).toEqual(board);
  });

  it('boardSchema_cardConnector_keptAndBlankRejected', () => {
    const board = fixtureBoard([fixtureCard('goal', { connector: 'refuses to' })]);
    expect(boardSchema.parse(board).cards[0]?.connector).toBe('refuses to');
    const blank = fixtureBoard([fixtureCard('goal', { connector: '' })]);
    expect(boardSchema.safeParse(blank).success).toBe(false);
  });

  it('boardSchema_missingName_rejected', () => {
    const board: Partial<Board> = fixtureBoard([]);
    delete board.name;
    rejects(board);
  });

  it('boardSchema_blankName_rejected', () => {
    rejects({ ...fixtureBoard([]), name: '   ' });
  });

  it('boardSchema_wrongFormatVersion_rejected', () => {
    rejects({ ...fixtureBoard([]), formatVersion: FORMAT_VERSION + 1 });
  });

  it('boardSchema_emptyDeckList_rejected', () => {
    rejects({ ...fixtureBoard([]), genres: { ...everyDeck(GENRES), setting: [] } });
  });

  it('boardSchema_unknownGenreInDeck_rejected', () => {
    rejects({ ...fixtureBoard([]), genres: { ...everyDeck(GENRES), conflict: ['steampunk'] } });
  });

  it('boardSchema_repeatedGenreInDeck_rejected', () => {
    rejects({
      ...fixtureBoard([]),
      genres: { ...everyDeck(GENRES), role: ['cyberpunk', 'cyberpunk'] },
    });
  });

  it('boardSchema_missingDeck_rejected', () => {
    const genres: Partial<DeckGenres> = everyDeck(GENRES);
    delete genres.modifier;
    rejects({ ...fixtureBoard([]), genres });
  });

  it('boardSchema_flatGenresList_rejected', () => {
    rejects({ ...fixtureBoard([]), genres: ['generic'] });
  });

  it('boardSchema_unknownCardType_rejected', () => {
    rejects(withCard({ type: 'planet' as never }));
  });

  it('boardSchema_roleThreeRings_rejected', () => {
    const card = combinedCard('role');
    rejects(withCard({ rings: [...card.rings, card.rings[1]!] }, card));
  });

  it('boardSchema_goalFourCues_rejected', () => {
    const four = fixtureCard('role').rings[0]!.cues;
    rejects(withCard({ rings: [{ cues: four, activeIndex: 0 }] }, fixtureCard('goal')));
  });

  it('boardSchema_activeIndexOutOfRange_rejected', () => {
    const card = fixtureCard('role');
    rejects(withCard({ rings: [{ ...card.rings[0]!, activeIndex: 4 }] }, card));
  });

  it('boardSchema_duplicateCardId_rejected', () => {
    rejects(fixtureBoard([fixtureCard('role'), fixtureCard('role')]));
  });

  it('boardSchema_selfTuck_rejected', () => {
    rejects(withCard({ tuckedUnder: 'role-1' }));
  });

  it('boardSchema_tuckCycle_rejected', () => {
    const [role, goal, conflict] = fixtureStack(0, 0);
    rejects(fixtureBoard([{ ...role!, tuckedUnder: conflict!.id }, goal!, conflict!]));
  });

  it('boardSchema_danglingTuck_accepted', () => {
    expect(boardSchema.safeParse(withCard({ tuckedUnder: 'gone' })).success).toBe(true);
  });

  it('boardSchema_zeroZoom_rejected', () => {
    rejects({ ...fixtureBoard([]), view: { panX: 0, panY: 0, zoom: 0 } });
  });

  it('boardSchema_badTimestamp_rejected', () => {
    rejects({ ...fixtureBoard([]), updatedAt: 'yesterday' });
  });
});
