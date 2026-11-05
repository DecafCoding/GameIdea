/**
 * The Questions panel answer recipes (docs/feature-questions-panel.html Recipes): pure
 * Board → Board functions, each run as 1 changeBoard (1 undo step, 1 save). A recipe that
 * changes nothing returns the same board, so the store makes no undo step and no save.
 * Board.questions is newest first; the last delete removes the field.
 */
import type { Answer, Board } from '@/shared/model';

/** The question texts answered on the board. */
export function answeredQuestions(board: Pick<Board, 'questions'>): ReadonlySet<string> {
  return new Set((board.questions ?? []).map((item) => item.question));
}

/**
 * Save Answer: puts { id, question, trimmed text } first in the list. Blank text or a
 * question already answered returns the same board. Throws on a Free Form board.
 */
export function addAnswer(board: Board, id: string, question: string, text: string): Board {
  if (board.kind !== 'onePager') throw new Error('Only a One-Pager board has questions.');
  const answer = text.trim();
  if (answer === '' || answeredQuestions(board).has(question)) return board;
  const item: Answer = { id, question, answer };
  return { ...board, questions: [item, ...(board.questions ?? [])] };
}

/**
 * Commits an answer edit (on blur): trims the text. An unknown id, blank text (the old
 * answer stays) or the same text returns the same board; else the answer changes in place.
 */
export function editAnswer(board: Board, id: string, text: string): Board {
  const answer = text.trim();
  const items = board.questions ?? [];
  const item = items.find((entry) => entry.id === id);
  if (!item || answer === '' || answer === item.answer) return board;
  return {
    ...board,
    questions: items.map((entry) => (entry.id === id ? { ...entry, answer } : entry)),
  };
}

/** Deletes an answer; an unknown id returns the same board; the last delete removes the field. */
export function deleteAnswer(board: Board, id: string): Board {
  const items = board.questions ?? [];
  if (!items.some((entry) => entry.id === id)) return board;
  const left = items.filter((entry) => entry.id !== id);
  if (left.length > 0) return { ...board, questions: left };
  // Destructure, never questions: undefined, so the key is gone from the record.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the removed list is dropped
  const { questions: _removed, ...rest } = board;
  return rest;
}
