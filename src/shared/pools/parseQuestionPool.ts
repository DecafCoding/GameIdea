/**
 * Question pool parsing: a hand-written type guard that turns the fetched
 * public/pools/question.json into a QuestionPool. Zod is reserved for features/export/,
 * so the shape is checked by hand here, as parsePool does for the deck pools.
 */
import type { QuestionPool, QuestionPoolCue } from '@/shared/model';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Checks the question pool file body and returns a fresh QuestionPool; throws on any broken rule. */
export function parseQuestionPool(data: unknown): QuestionPool {
  if (!isRecord(data)) {
    throw new Error('The question pool file is not a JSON object.');
  }
  if (data.type !== 'question') {
    throw new Error(`The question pool file says its type is ${String(data.type)}.`);
  }
  if (!Array.isArray(data.cues) || data.cues.length === 0) {
    throw new Error('The question pool file has no questions.');
  }
  const cues = data.cues.map((raw: unknown, index): QuestionPoolCue => {
    if (!isRecord(raw) || !isNonEmptyString(raw.id) || !isNonEmptyString(raw.text)) {
      throw new Error(`Question ${index} in the question pool needs an id and a text.`);
    }
    // Any other key on a question is ignored, not copied.
    return { id: raw.id, text: raw.text };
  });
  return { type: 'question', cues };
}
