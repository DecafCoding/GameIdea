/**
 * Panel resize as pure rules (user 2026-11-05). The Details panel, the Core Loop card and
 * the Questions panel resize by their left or right edge once highlighted; the Hook Card
 * never resizes. A right-edge drag keeps the left side still; a left-edge drag keeps the
 * right side still, so the panel's place moves by the width it lost or gained. Only the
 * width changes: each height still grows with its content. A release is 1 changeBoard,
 * 1 undo step and 1 save; a release at the same width returns the same board.
 */
import { CONCEPT_WIDTH, PANEL_WIDTH, type Board } from '@/shared/model';
import { conceptPlace, conceptWidth } from './concept';
import { HOOK_WIDTH } from './placement';
import { pinQuestions, questionsPlace } from './questionsPlace';

/** The 3 resizable panels. */
export type PanelKind = 'concept' | 'loop' | 'questions';
export type PanelEdge = 'left' | 'right';

export interface WidthRange {
  min: number;
  max: number;
}

/** Each panel's width range: Details 232 to 640, the other 2 240 to 640. */
export const PANEL_RANGE: Record<PanelKind, WidthRange> = {
  concept: CONCEPT_WIDTH,
  loop: PANEL_WIDTH,
  questions: PANEL_WIDTH,
};

/** The width an edge drag gives, and how far the left side moves (0 for the right edge). */
export interface EdgeResult {
  width: number;
  shift: number;
}

/**
 * The width after an edge moves dx flow pixels, rounded and kept within the range. For the
 * left edge, shift is the move of the left side, so the right side stays still.
 */
export function edgeResize(
  width: number,
  range: WidthRange,
  edge: PanelEdge,
  dx: number,
): EdgeResult {
  const raw = edge === 'right' ? width + dx : width - dx;
  const next = Math.min(range.max, Math.max(range.min, Math.round(raw)));
  return { width: next, shift: edge === 'left' ? width - next : 0 };
}

/** The Core Loop card's width: its saved width, or 240. */
export function loopWidth(board: Board): number {
  const loop = board.cards.find((card) => card.type === 'loop');
  return loop?.width ?? HOOK_WIDTH;
}

/** The Questions panel's width: its saved width, or 240. */
export function questionsWidth(board: Board): number {
  return board.questionsWidth ?? PANEL_WIDTH.default;
}

/** A panel's current width. */
export function panelWidth(board: Board, kind: PanelKind): number {
  if (kind === 'concept') return conceptWidth(board);
  if (kind === 'loop') return loopWidth(board);
  return questionsWidth(board);
}

/**
 * Resizes a panel by moving 1 edge dx flow pixels. The same board when the width does not
 * change or the board has no such panel.
 */
export function resizePanel(board: Board, kind: PanelKind, edge: PanelEdge, dx: number): Board {
  if (board.kind !== 'onePager') return board;
  const before = panelWidth(board, kind);
  const { width, shift } = edgeResize(before, PANEL_RANGE[kind], edge, dx);
  if (width === before) return board;
  if (kind === 'concept') {
    const place = conceptPlace(board);
    if (!place) return board;
    const next: Board = { ...board, conceptWidth: width };
    return shift === 0 ? next : { ...next, conceptPos: { x: place.x + shift, y: place.y } };
  }
  if (kind === 'questions') {
    const place = questionsPlace(board);
    if (!place) return board;
    const next: Board = { ...board, questionsWidth: width };
    return shift === 0 ? next : { ...next, questionsPos: { x: place.x + shift, y: place.y } };
  }
  const loop = board.cards.find((card) => card.type === 'loop');
  if (!loop) return board;
  const after: Board = {
    ...board,
    cards: board.cards.map((card) =>
      card.id === loop.id ? { ...card, width, x: card.x + shift } : card,
    ),
  };
  // The Questions panel never follows the Core Loop card.
  return pinQuestions(board, after);
}
