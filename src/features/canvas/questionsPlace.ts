/**
 * The Questions panel's place as pure rules (design 9.17, user 2026-11-05). The panel moves
 * freely on its own: once dragged, its place is Board.questionsPos. Until then it sits
 * QUESTIONS_DROP below the Core Loop card's top (the card's 240 px of room plus 24), at the
 * card's left; with no Core Loop card (a board made before Phase 9), at the Core Loop
 * card's default place, the same distance down. The rule never reads the card's drawn
 * height, so the panel never moves when the card grows, and pinQuestions saves the place
 * when the Core Loop card moves, so the panel never follows it. Null on Free Form.
 */
import type { Board } from '@/shared/model';
import { ONE_PAGER_LOOP_SPOT } from '@/shared/store';
import { HOOK_WIDTH, type Point } from './placement';

/** The React Flow node id of the panel. */
export const QUESTIONS_NODE_ID = 'questions-panel';
/** How far below the Core Loop card's top the panel starts: 240 of room plus a 24 gap. */
export const QUESTIONS_DROP = 264;
/** The panel width: the Core Loop card width. */
export const QUESTIONS_WIDTH = HOOK_WIDTH;

/** The panel's top-left in flow coordinates; null unless the board is a One-Pager board. */
export function questionsPlace(board: Board): Point | null {
  if (board.kind !== 'onePager') return null;
  if (board.questionsPos) return { x: board.questionsPos.x, y: board.questionsPos.y };
  const loop = board.cards.find((card) => card.type === 'loop');
  const anchor = loop ?? ONE_PAGER_LOOP_SPOT;
  return { x: anchor.x, y: anchor.y + QUESTIONS_DROP };
}

/**
 * Keeps the panel where it was when a change moves the Core Loop card: a board with no
 * saved questionsPos gets the place it had before. Returns `after` itself when nothing
 * needs saving.
 */
export function pinQuestions(before: Board, after: Board): Board {
  if (before.questionsPos || after.questionsPos) return after;
  const was = questionsPlace(before);
  const now = questionsPlace(after);
  if (!was || !now || (was.x === now.x && was.y === now.y)) return after;
  return { ...after, questionsPos: was };
}

/**
 * Moves the panel to (x, y): 1 changeBoard, 1 undo step, 1 save. The same board on Free
 * Form or when the saved place does not change.
 */
export function moveQuestions(board: Board, x: number, y: number): Board {
  const place = questionsPlace(board);
  if (!place || (board.questionsPos && place.x === x && place.y === y)) return board;
  return { ...board, questionsPos: { x, y } };
}
