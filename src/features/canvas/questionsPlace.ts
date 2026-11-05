/**
 * The Questions panel's place as a pure rule (design 9.17, docs/feature-questions-panel.html
 * Panel): on a One-Pager board, left = the Core Loop card's left, top = its top + its drawn
 * height + 24. The drawn height comes from React Flow's measure; unmeasured, the card's
 * 200 px minimum. A One-Pager board with no Core Loop card (made before Phase 9) uses the
 * Core Loop card's default place, (680, 96). Never stored; null on a Free Form board.
 */
import type { Board } from '@/shared/model';
import { ONE_PAGER_LOOP_SPOT } from '@/shared/store';
import { cardSize, HOOK_WIDTH, type Point } from './placement';

/** The React Flow node id of the panel. */
export const QUESTIONS_NODE_ID = 'questions-panel';
/** The gap between the Core Loop card's bottom edge and the panel. */
export const QUESTIONS_GAP = 24;
/** The panel width: the Core Loop card width. */
export const QUESTIONS_WIDTH = HOOK_WIDTH;

/** The panel's top-left in flow coordinates; null unless the board is a One-Pager board. */
export function questionsPlace(board: Board, loopHeight?: number): Point | null {
  if (board.kind !== 'onePager') return null;
  const loop = board.cards.find((card) => card.type === 'loop');
  if (!loop) return { x: ONE_PAGER_LOOP_SPOT.x, y: ONE_PAGER_LOOP_SPOT.y };
  return { x: loop.x, y: loop.y + (loopHeight ?? cardSize(loop).height) + QUESTIONS_GAP };
}
