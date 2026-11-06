/**
 * Tests for the answer recipes, plus the Milestone 2 check that the pick rule, the
 * recipes and the text file agree on the answers fixture.
 */
import { describe, expect, it } from 'vitest';
import { boardText } from '@/features/export';
import { fixtureBoard, onePagerWithAnswers } from '@/test/fixtures/boards';
import { addAnswer, answeredQuestions, deleteAnswer, editAnswer } from './answers';
import { pickQuestion } from './pickQuestion';

const FIXTURE_POOL = ['Who is the player?', 'What makes it fun?', 'What could go wrong?'];

describe('answeredQuestions', () => {
  it('answeredQuestions_fixture_returnsQuestionTexts', () => {
    expect([...answeredQuestions(onePagerWithAnswers())]).toEqual([
      'What makes it fun?',
      'Who is the player?',
    ]);
    expect(answeredQuestions(fixtureBoard([])).size).toBe(0);
  });
});

describe('addAnswer', () => {
  it('addAnswer_text_putsItemFirst', () => {
    const board = onePagerWithAnswers();
    const next = addAnswer(board, 'answer-3', 'What could go wrong?', 'Too dark.');
    expect(next.questions?.map((a) => a.id)).toEqual(['answer-3', 'answer-2', 'answer-1']);
    expect(next.questions?.[0]).toEqual({
      id: 'answer-3',
      question: 'What could go wrong?',
      answer: 'Too dark.',
    });
    expect(board.questions).toHaveLength(2);
  });

  it('addAnswer_trimsText', () => {
    const next = addAnswer(onePagerWithAnswers(), 'a', 'What could go wrong?', '  Too dark. \n');
    expect(next.questions?.[0]?.answer).toBe('Too dark.');
  });

  it('addAnswer_blankText_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(addAnswer(board, 'a', 'What could go wrong?', '  ')).toBe(board);
  });

  it('addAnswer_answeredQuestion_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(addAnswer(board, 'a', 'Who is the player?', 'Someone.')).toBe(board);
  });

  it('addAnswer_freeForm_throws', () => {
    expect(() => addAnswer(fixtureBoard([]), 'a', 'Why?', 'Because.')).toThrow();
  });

  it('addAnswer_noQuestionsField_createsList', () => {
    const board = onePagerWithAnswers();
    delete board.questions;
    expect(addAnswer(board, 'a', 'Why?', 'Because.').questions).toEqual([
      { id: 'a', question: 'Why?', answer: 'Because.' },
    ]);
  });
});

describe('editAnswer', () => {
  it('editAnswer_newText_replacesInPlace', () => {
    const next = editAnswer(onePagerWithAnswers(), 'answer-1', ' An early bird. ');
    expect(next.questions?.map((a) => a.answer)).toEqual(['Chasing the light.', 'An early bird.']);
  });

  it('editAnswer_sameText_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(editAnswer(board, 'answer-1', 'A night owl. ')).toBe(board);
  });

  it('editAnswer_blankText_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(editAnswer(board, 'answer-1', ' ')).toBe(board);
  });

  it('editAnswer_unknownId_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(editAnswer(board, 'nope', 'Text.')).toBe(board);
  });
});

describe('deleteAnswer', () => {
  it('deleteAnswer_removesItem', () => {
    const next = deleteAnswer(onePagerWithAnswers(), 'answer-2');
    expect(next.questions?.map((a) => a.id)).toEqual(['answer-1']);
  });

  it('deleteAnswer_last_removesField', () => {
    const next = deleteAnswer(deleteAnswer(onePagerWithAnswers(), 'answer-2'), 'answer-1');
    expect('questions' in next).toBe(false);
  });

  it('deleteAnswer_unknownId_sameBoard', () => {
    const board = onePagerWithAnswers();
    expect(deleteAnswer(board, 'nope')).toBe(board);
  });
});

describe('Milestone 2', () => {
  it('questions_fixtureBoard_rulesAndTextAgree', () => {
    const board = onePagerWithAnswers();
    const added = addAnswer(board, 'answer-3', 'What could go wrong?', 'Too dark.');
    expect(deleteAnswer(added, 'answer-3')).toEqual(board);

    const answered = answeredQuestions(board);
    for (const r of [0, 0.5, 0.99]) {
      const pick = pickQuestion({ pool: FIXTURE_POOL, answered, seen: [], current: null }, () => r);
      expect(pick?.question).toBe('What could go wrong?');
    }

    const text = boardText(board);
    const at = (heading: string) => text.indexOf(`\n${heading}\n`);
    expect(at('Core Loop')).toBeGreaterThan(-1);
    expect(at('Questions')).toBeGreaterThan(at('Core Loop'));
    expect(at('Details')).toBeGreaterThan(at('Questions'));
  });
});
