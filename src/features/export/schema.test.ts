/**
 * Tests for the board file schema: every fixture passes unchanged, and each rule rejects
 * its bad case.
 */
import { describe, expect, it } from 'vitest';
import {
  CARD_TYPES,
  allGenresOn,
  FORMAT_VERSION,
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
  onePagerBoard,
  onePagerWithAnswers,
} from '@/test/fixtures/boards';
import { newBoard } from '@/shared/store';
import { boardFileJson } from './boardFile';
import { parseBoardFile } from './importBoard';
import { boardSchema } from './schema';

function mixedBoard(): Board {
  return fixtureBoard(
    [
      ...CARD_TYPES.filter((type) => type !== 'loop').map((type, i) =>
        fixtureCard(type, { id: `${type}-x`, x: i * 300 }),
      ),
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
    rejects({ ...fixtureBoard([]), genres: { ...allGenresOn(), resource: [] } });
  });

  it('boardSchema_unknownGenreInDeck_rejected', () => {
    rejects({ ...fixtureBoard([]), genres: { ...allGenresOn(), progression: ['steampunk'] } });
  });

  it('boardSchema_repeatedGenreInDeck_rejected', () => {
    rejects({
      ...fixtureBoard([]),
      genres: { ...allGenresOn(), mechanic: ['horror', 'horror'] },
    });
  });

  it('boardSchema_missingDeck_rejected', () => {
    const genres: Partial<DeckGenres> = allGenresOn();
    delete genres.constraint;
    rejects({ ...fixtureBoard([]), genres });
  });

  it('boardSchema_flatGenresList_rejected', () => {
    rejects({ ...fixtureBoard([]), genres: ['roguelike'] });
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

  it('schema_everyCardType_roundTrips', () => {
    const resource = combinedCard('role', {
      id: 'resource-combined',
      type: 'resource',
      rings: [
        { cues: fixtureCard('resource').rings[0]!.cues, activeIndex: 1 },
        { cues: fixtureCard('modifier').rings[0]!.cues, activeIndex: 2, modDeck: 'resource' },
      ],
    });
    const board = fixtureBoard([
      // A Free Form board: the Core Loop card is One-Pager only.
      ...CARD_TYPES.filter((type) => type !== 'loop').map((type, i) =>
        fixtureCard(type, { id: `${type}-x`, x: i * 300, locked: type === 'goal' }),
      ),
      fixtureCard('modifier', { id: 'mod-resource', modDeck: 'resource' }),
      fixtureCard('modifier', { id: 'mod-setting', modDeck: 'setting' }),
      resource,
      fixtureCard('modifier', { id: 'on-top', onTopOf: 'resource-combined' }),
      fixtureCard('role', { id: 'under-hook', tuckedUnder: 'hook-x', connector: 'You play a' }),
    ]);
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_modifierWithoutModDeck_rejects', () => {
    const { modDeck: _drop, ...bare } = fixtureCard('modifier');
    void _drop;
    rejects(fixtureBoard([bare]));
  });

  it('schema_mergedRingWithoutModDeck_rejects', () => {
    const card = combinedCard('setting');
    rejects(withCard({ rings: [card.rings[0]!, { ...card.rings[1]!, modDeck: undefined }] }, card));
  });

  it('schema_modDeckOnNounRing_rejects', () => {
    const card = fixtureCard('role');
    rejects(withCard({ rings: [{ ...card.rings[0]!, modDeck: 'role' }] }, card));
  });

  it('schema_modDeckOnNonModifierCard_rejects', () => {
    rejects(withCard({ modDeck: 'role' }, fixtureCard('goal')));
  });

  it('schema_hookWithRings_rejects', () => {
    rejects(withCard({ rings: fixtureCard('role').rings }, fixtureCard('hook')));
  });

  it('schema_tuckedHook_rejects', () => {
    rejects(fixtureBoard([fixtureCard('role'), fixtureCard('hook', { tuckedUnder: 'role-1' })]));
  });

  it('schema_onTopOfNonBase_rejects', () => {
    rejects(fixtureBoard([fixtureCard('goal'), fixtureCard('modifier', { onTopOf: 'goal-1' })]));
    rejects(fixtureBoard([fixtureCard('role'), fixtureCard('goal', { onTopOf: 'role-1' })]));
  });

  it('schema_twoOnTopOfOneBase_rejects', () => {
    rejects(
      fixtureBoard([
        combinedCard('role'),
        fixtureCard('modifier', { onTopOf: 'role-1' }),
        fixtureCard('modifier', { id: 'modifier-2', onTopOf: 'role-1' }),
      ]),
    );
  });

  it('schema_onTopCardTucked_rejects', () => {
    rejects(
      fixtureBoard([
        combinedCard('role'),
        fixtureCard('goal', { id: 'goal-1' }),
        fixtureCard('modifier', { onTopOf: 'role-1', tuckedUnder: 'goal-1' }),
      ]),
    );
    rejects(
      fixtureBoard([
        combinedCard('role'),
        fixtureCard('modifier', { onTopOf: 'role-1' }),
        fixtureCard('goal', { tuckedUnder: 'modifier-1' }),
      ]),
    );
  });

  it('schema_missingLocked_rejects', () => {
    const { locked: _drop, ...bare } = fixtureCard('role');
    void _drop;
    rejects(fixtureBoard([bare as Card]));
  });

  it('schema_danglingOnTopOf_accepts', () => {
    const board = fixtureBoard([fixtureCard('modifier', { onTopOf: 'gone' })]);
    expect(boardSchema.safeParse(board).success).toBe(true);
  });

  it('schema_mechanicWithTwoRings_rejects', () => {
    const card = fixtureCard('mechanic');
    rejects(withCard({ rings: [card.rings[0]!, card.rings[0]!] }, card));
  });
});

/** The One-Pager fixture with its cards changed by fn. */
function onePagerWith(fn: (cards: Card[]) => Card[]): Board {
  const board = onePagerBoard();
  return { ...board, cards: fn(board.cards) };
}

describe('boardSchema One-Pager rules', () => {
  it('boardSchema_goodOnePager_passes', () => {
    const result = boardSchema.safeParse(onePagerBoard());
    expect(result.success).toBe(true);
    expect(result.data).toEqual(onePagerBoard());
  });

  it('boardSchema_onePagerNoHook_fails', () => {
    rejects(onePagerWith((cards) => cards.filter((card) => card.type !== 'hook')));
  });

  it('boardSchema_onePagerTwoHooks_fails', () => {
    rejects(onePagerWith((cards) => [...cards, fixtureCard('hook', { id: 'hook-2', x: 900 })]));
  });

  it('boardSchema_conceptCardTucked_fails', () => {
    rejects(
      onePagerWith((cards) =>
        cards.map((c) => (c.id === 'resource-c1' ? { ...c, tuckedUnder: 'hook-1' } : c)),
      ),
    );
  });

  it('boardSchema_hookInConcept_fails', () => {
    rejects(
      onePagerWith((cards) =>
        cards.map((c) => (c.type === 'hook' ? { ...c, inConcept: true } : c)),
      ),
    );
  });

  it('boardSchema_cardTuckedUnderConceptCard_fails', () => {
    rejects(
      onePagerWith((cards) =>
        cards.map((c) => (c.id === 'modifier-1' ? { ...c, tuckedUnder: 'resource-c1' } : c)),
      ),
    );
  });

  it('boardSchema_freeFormInConcept_fails', () => {
    rejects(fixtureBoard([fixtureCard('resource', { inConcept: true })]));
  });

  it('boardSchema_freeFormConceptWidth_fails', () => {
    rejects({ ...fixtureBoard([]), conceptWidth: 232 });
  });

  it('boardSchema_conceptWidthOutOfRange_fails', () => {
    rejects({ ...onePagerBoard(), conceptWidth: 231 });
    rejects({ ...onePagerBoard(), conceptWidth: 641 });
    expect(boardSchema.safeParse({ ...onePagerBoard(), conceptWidth: 640 }).success).toBe(true);
  });

  it('boardSchema_onePagerNoWidth_passes', () => {
    const board: Partial<Board> = onePagerBoard();
    delete board.conceptWidth;
    const result = boardSchema.safeParse(board);
    expect(result.success).toBe(true);
    expect(result.data?.conceptWidth).toBeUndefined();
  });

  it('boardSchema_missingKind_fails', () => {
    const board: Partial<Board> = fixtureBoard([]);
    delete board.kind;
    rejects(board);
  });

  it('boardSchema_missingInConcept_fails', () => {
    const card: Partial<Card> = fixtureCard('goal');
    delete card.inConcept;
    rejects({ ...fixtureBoard([]), cards: [card] });
  });
});

/** The One-Pager fixture plus a Core Loop card loop-1 with the given overrides. */
function withLoop(overrides: Partial<Card> = {}): Board {
  const board = onePagerBoard();
  return {
    ...board,
    cards: [
      ...board.cards,
      fixtureCard('loop', { id: 'loop-1', x: 680, y: 96, z: 9, ...overrides }),
    ],
  };
}

describe('boardSchema Core Loop rules', () => {
  it('schema_onePagerWithLoopCard_roundTrips', () => {
    for (const board of [withLoop(), withLoop({ loopText: 'summon → earn clues' })]) {
      expect(parseBoardFile(boardFileJson(board))).toEqual(board);
    }
  });

  it('schema_loopTextOnOtherType_rejects', () => {
    const board = withLoop();
    rejects({
      ...board,
      cards: board.cards.map((card) =>
        card.id === 'role-t1' ? { ...card, loopText: 'my loop' } : card,
      ),
    });
  });

  it('schema_blankLoopText_rejects', () => {
    rejects(withLoop({ loopText: '   ' }));
    rejects(withLoop({ loopText: '' }));
  });

  it('schema_loopTextKeepsSpaces_notTrimmed', () => {
    const board = withLoop({ loopText: ' my loop ' });
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_loopCardWithRings_rejects', () => {
    rejects(withLoop({ rings: fixtureCard('mood').rings }));
  });

  it('schema_loopCardTucked_rejects', () => {
    rejects(withLoop({ tuckedUnder: 'hook-1' }));
  });

  it('schema_cardTuckedUnderLoop_rejects', () => {
    const board = withLoop();
    rejects({
      ...board,
      cards: [...board.cards, fixtureCard('goal', { id: 'goal-1', tuckedUnder: 'loop-1' })],
    });
  });

  it('schema_loopCardInConcept_rejects', () => {
    rejects(withLoop({ inConcept: true }));
  });

  it('schema_loopCardOnTopOf_rejects', () => {
    rejects(withLoop({ onTopOf: 'role-t1' }));
    const board = withLoop();
    rejects({
      ...board,
      cards: [...board.cards, fixtureCard('modifier', { id: 'mod-top', onTopOf: 'loop-1' })],
    });
  });

  it('schema_loopCardConnector_rejects', () => {
    rejects(withLoop({ connector: 'and then' }));
  });

  it('schema_loopCardModDeck_rejects', () => {
    rejects(withLoop({ modDeck: 'role' }));
  });

  it('schema_twoLoopCards_rejects', () => {
    const board = withLoop();
    rejects({
      ...board,
      cards: [...board.cards, fixtureCard('loop', { id: 'loop-2', x: 960, y: 96, z: 10 })],
    });
  });

  it('schema_loopCardOnFreeForm_rejects', () => {
    rejects(fixtureBoard([fixtureCard('loop', { id: 'loop-1' })]));
  });

  it('schema_newOnePagerBoard_accepts', () => {
    const board = newBoard({ kind: 'onePager' });
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_onePagerWithoutLoopCard_accepts', () => {
    const board = onePagerBoard();
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });
});

describe('boardSchema Questions rules', () => {
  const withAnswers = (questions: unknown): unknown => ({ ...onePagerWithAnswers(), questions });
  const answer = (id: string, question: string, text: string) => ({ id, question, answer: text });

  it('schema_onePagerWithQuestions_roundTrips', () => {
    const board = onePagerWithAnswers();
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_noQuestionsField_accepted', () => {
    const board: Board = onePagerWithAnswers();
    delete board.questions;
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_questionsOnFreeForm_rejected', () => {
    rejects({ ...fixtureBoard([]), questions: [answer('a', 'Why?', 'Because.')] });
  });

  it('schema_emptyQuestionsArray_rejected', () => {
    rejects(withAnswers([]));
  });

  it('schema_blankAnswer_rejected', () => {
    rejects(withAnswers([answer('a', 'Why?', '  ')]));
    rejects(withAnswers([answer('a', 'Why?', '')]));
  });

  it('schema_blankQuestion_rejected', () => {
    rejects(withAnswers([answer('a', ' ', 'Because.')]));
  });

  it('schema_answerWithSpaces_notTrimmed', () => {
    const board = { ...onePagerWithAnswers(), questions: [answer('a', ' Why? ', ' Because. ')] };
    expect(parseBoardFile(boardFileJson(board))).toEqual(board);
  });

  it('schema_repeatedAnswerId_rejected', () => {
    rejects(withAnswers([answer('a', 'Why?', 'One.'), answer('a', 'How?', 'Two.')]));
  });

  it('schema_sameQuestionTwice_rejected', () => {
    rejects(withAnswers([answer('a', 'Why?', 'One.'), answer('b', 'Why?', 'Two.')]));
  });
});
