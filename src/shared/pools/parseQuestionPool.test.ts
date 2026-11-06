/**
 * Tests for the hand-written question pool parser.
 */
import { describe, expect, it } from 'vitest';
import { parseQuestionPool } from './parseQuestionPool';

const good = {
  type: 'question',
  cues: [
    { id: 'question-0001', text: 'Who is the player?' },
    { id: 'question-0002', text: 'What makes it fun?' },
  ],
};

describe('parseQuestionPool', () => {
  it('parseQuestionPool_goodFile_returnsCues', () => {
    expect(parseQuestionPool(good)).toEqual(good);
  });

  it('parseQuestionPool_wrongType_throws', () => {
    expect(() => parseQuestionPool({ ...good, type: 'goal' })).toThrow(/type/);
  });

  it('parseQuestionPool_noCues_throws', () => {
    expect(() => parseQuestionPool({ type: 'question', cues: [] })).toThrow(/no questions/);
    expect(() => parseQuestionPool({ type: 'question' })).toThrow(/no questions/);
  });

  it('parseQuestionPool_blankText_throws', () => {
    const data = { type: 'question', cues: [{ id: 'question-0001', text: '  ' }] };
    expect(() => parseQuestionPool(data)).toThrow(/needs an id and a text/);
  });

  it('parseQuestionPool_extraKey_isDropped', () => {
    const data = { type: 'question', cues: [{ id: 'q', text: 'Why?', genres: ['rpg'] }] };
    expect(parseQuestionPool(data).cues[0]).toEqual({ id: 'q', text: 'Why?' });
  });
});
