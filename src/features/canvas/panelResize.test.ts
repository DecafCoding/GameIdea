/**
 * Tests for the panel resize rules: the edge math, each panel's width range, the left edge
 * keeping the right side still, and the Questions panel never following the Core Loop card.
 */
import { describe, expect, it } from 'vitest';
import type { Board } from '@/shared/model';
import { fixtureBoard, fixtureCard, onePagerWithLoop } from '@/test/fixtures/boards';
import { conceptPlace } from './concept';
import { edgeResize, loopWidth, panelWidth, questionsWidth, resizePanel } from './panelResize';
import { cardSize } from './placement';
import { questionsPlace } from './questionsPlace';

const RANGE = { min: 240, max: 640 };
const loopOf = (board: Board) => board.cards.find((c) => c.type === 'loop')!;

describe('edgeResize', () => {
  it('edgeResize_rightEdge_growsAndKeepsLeft', () => {
    expect(edgeResize(240, RANGE, 'right', 60.4)).toEqual({ width: 300, shift: 0 });
  });

  it('edgeResize_leftEdge_movesLeftSideByTheChange', () => {
    expect(edgeResize(240, RANGE, 'left', -60)).toEqual({ width: 300, shift: -60 });
    expect(edgeResize(300, RANGE, 'left', 40)).toEqual({ width: 260, shift: 40 });
  });

  it('edgeResize_clampsToRange', () => {
    expect(edgeResize(240, RANGE, 'right', -100)).toEqual({ width: 240, shift: 0 });
    expect(edgeResize(600, RANGE, 'right', 500)).toEqual({ width: 640, shift: 0 });
    expect(edgeResize(250, RANGE, 'left', 100)).toEqual({ width: 240, shift: 10 });
  });
});

describe('resizePanel', () => {
  it('resizePanel_defaults_240ForLoopAndQuestions', () => {
    const board = onePagerWithLoop();
    expect(loopWidth(board)).toBe(240);
    expect(questionsWidth(board)).toBe(240);
    expect(panelWidth(board, 'concept')).toBe(board.conceptWidth);
  });

  it('resizePanel_conceptRight_savesWidthOnly', () => {
    const board = onePagerWithLoop();
    const next = resizePanel(board, 'concept', 'right', 100);
    expect(next.conceptWidth).toBe(332);
    expect(next.conceptPos).toBeUndefined();
  });

  it('resizePanel_conceptLeft_keepsRightSideStill', () => {
    const board = onePagerWithLoop();
    const was = conceptPlace(board)!;
    const next = resizePanel(board, 'concept', 'left', -100);
    expect(next.conceptWidth).toBe(332);
    expect(next.conceptPos).toEqual({ x: was.x - 100, y: was.y });
  });

  it('resizePanel_conceptClamps232To640', () => {
    expect(resizePanel(onePagerWithLoop(), 'concept', 'right', 900).conceptWidth).toBe(640);
  });

  it('resizePanel_questionsLeft_savesWidthAndPlace', () => {
    const board = onePagerWithLoop();
    const was = questionsPlace(board)!;
    const next = resizePanel(board, 'questions', 'left', -60);
    expect(next.questionsWidth).toBe(300);
    expect(next.questionsPos).toEqual({ x: was.x - 60, y: was.y });
    expect(resizePanel(board, 'questions', 'right', 60).questionsPos).toBeUndefined();
  });

  it('resizePanel_loopRight_savesCardWidthAndPlacementUsesIt', () => {
    const next = resizePanel(onePagerWithLoop(), 'loop', 'right', 80);
    expect(loopOf(next).width).toBe(320);
    expect(cardSize(loopOf(next)).width).toBe(320);
    expect(next.questionsPos).toBeUndefined();
  });

  it('resizePanel_loopLeft_movesCardAndPinsQuestions', () => {
    const board = onePagerWithLoop();
    const panel = questionsPlace(board)!;
    const next = resizePanel(board, 'loop', 'left', -80);
    expect(loopOf(next).width).toBe(320);
    expect(loopOf(next).x).toBe(loopOf(board).x - 80);
    expect(next.questionsPos).toEqual(panel);
  });

  it('resizePanel_sameWidth_sameBoard', () => {
    const board = onePagerWithLoop();
    expect(resizePanel(board, 'loop', 'right', -50)).toBe(board);
    expect(resizePanel(board, 'questions', 'right', 0.3)).toBe(board);
  });

  it('resizePanel_freeForm_sameBoard', () => {
    const board = fixtureBoard([fixtureCard('hook')]);
    expect(resizePanel(board, 'questions', 'right', 100)).toBe(board);
  });
});
