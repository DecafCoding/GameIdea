/**
 * Tests for board → React Flow nodes: z order, and the Deal Stack reveal delays.
 */
import { describe, expect, it } from 'vitest';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
  secondModifier,
  onePagerBoard,
  onePagerWithLoop,
} from '@/test/fixtures/boards';
import { dealDelays, toNodes, type CardNodeData } from './nodes';

const UI = { selectedId: null, hiddenIds: new Set<string>() };
const zOf = (nodes: ReturnType<typeof toNodes>, id: string) =>
  nodes.find((n) => n.id === id)!.zIndex!;

describe('toNodes', () => {
  it('toNodes_stack_tuckedCardsBelowRoot', () => {
    const nodes = toNodes(fixtureBoard(fixtureStack(0, 0)), UI);
    expect(zOf(nodes, 'role-1')).toBeGreaterThan(zOf(nodes, 'goal-1'));
    expect(zOf(nodes, 'goal-1')).toBeGreaterThan(zOf(nodes, 'conflict-1'));
  });

  it('toNodes_newerRoot_paintsAboveOlder', () => {
    const board = fixtureBoard([
      ...fixtureStack(0, 0, '1', 5),
      fixtureCard('setting', { x: 50, y: 50, z: 1 }),
    ]);
    const nodes = toNodes(board, UI);
    expect(zOf(nodes, 'conflict-1')).toBeGreaterThan(zOf(nodes, 'setting-1'));
    expect(nodes.map((n) => n.id)).toEqual(['setting-1', 'conflict-1', 'goal-1', 'role-1']);
  });

  it('toNodes_notes_belowCards', () => {
    const nodes = toNodes(fixtureBoard([fixtureCard('role')], [fixtureNote()]), UI);
    expect(nodes[0]!.id).toBe('note-1');
    expect(zOf(nodes, 'note-1')).toBeLessThan(zOf(nodes, 'role-1'));
  });
});

describe('toNodes below', () => {
  it('toNodes_stack_belowIsNextCardInStack', () => {
    const nodes = toNodes(fixtureBoard(fixtureStack(0, 0)), UI);
    const below = (id: string) => nodes.find((n) => n.id === id)!.data as CardNodeData;
    expect(below('role-1').below).toMatchObject({ id: 'goal-1', type: 'goal' });
    expect(below('goal-1').below).toMatchObject({ id: 'conflict-1', type: 'conflict' });
    expect(below('conflict-1').below).toBeNull();
  });

  it('toNodes_tuckedSetting_belowHasKindTextAndSavedWord', () => {
    const setting = fixtureCard('setting', {
      x: 0,
      y: 56,
      z: 2,
      tuckedUnder: 'role-1',
    });
    setting.rings[0] = { ...setting.rings[0]!, activeIndex: 2 };
    setting.connector = 'after the';
    const nodes = toNodes(fixtureBoard([fixtureCard('role'), setting]), UI);
    const data = (id: string) => nodes.find((n) => n.id === id)!.data as CardNodeData;
    expect(data('role-1').below).toEqual({
      id: 'setting-1',
      type: 'setting',
      text: 'eclipse',
      saved: 'after the',
    });
    expect(data('setting-1').below).toBeNull();
  });

  it('toNodes_onTopCard_hasNoNode', () => {
    const board = fixtureBoard([
      combinedCard('role'),
      fixtureCard('goal', { y: 56, z: 2, tuckedUnder: 'role-1' }),
      secondModifier({ onTopOf: 'role-1' }),
    ]);
    const nodes = toNodes(board, UI);
    expect(nodes.map((n) => n.id)).not.toContain('modifier-2');
    expect(nodes).toHaveLength(2);
  });

  it('toNodes_badgeBelowBaseWithOnTop_readsOnTopAdjective', () => {
    const board = fixtureBoard([
      fixtureCard('goal'),
      combinedCard('role', { y: 56, z: 2, tuckedUnder: 'goal-1' }),
      secondModifier({ onTopOf: 'role-1' }),
    ]);
    const goal = toNodes(board, UI).find((n) => n.id === 'goal-1')!.data as CardNodeData;
    expect(goal.below?.text).toBe('devout exiled navigator');
  });
});

describe('toNodes on a One-Pager board', () => {
  it('toNodes_conceptCard_noCardNode', () => {
    const ids = toNodes(onePagerBoard(), UI).map((node) => node.id);
    for (const id of ['resource-c1', 'resource-c2', 'setting-c1', 'mechanic-c1']) {
      expect(ids).not.toContain(id);
    }
    expect(ids).toContain('hook-1');
    expect(ids).toContain('mechanic-t1');
  });

  it('toNodes_onePager_conceptNodeBesideHook', () => {
    const nodes = toNodes({ ...onePagerBoard(), conceptWidth: 300 }, UI);
    const panel = nodes.find((node) => node.id === 'concept-panel')!;
    expect(panel.type).toBe('concept');
    expect(panel.position).toEqual({ x: 364, y: 96 });
    expect(panel.data).toEqual({ width: 300, highlighted: false });
    expect(panel.zIndex).toBe(1);
    expect(panel.draggable).toBe(true);
    // Above notes, below every card.
    const cardZ = nodes.filter((n) => n.type === 'card').map((n) => n.zIndex ?? 0);
    expect(Math.min(...cardZ)).toBeGreaterThan(1);
  });

  it('toNodes_onePagerWithConceptPos_panelAtSavedPlace', () => {
    const nodes = toNodes({ ...onePagerBoard(), conceptPos: { x: 900, y: 480 } }, UI);
    const panel = nodes.find((node) => node.id === 'concept-panel')!;
    expect(panel.position).toEqual({ x: 900, y: 480 });
  });

  it('toNodes_freeForm_noConceptNode', () => {
    const board = fixtureBoard([fixtureCard('hook')]);
    expect(toNodes(board, UI).some((node) => node.type === 'concept')).toBe(false);
  });
});

describe('dealDelays', () => {
  it('dealDelays_fiveCards_200msApart', () => {
    expect([...dealDelays(['a', 'b', 'c', 'd', 'e']).values()]).toEqual([0, 200, 400, 600, 800]);
  });

  it('dealDelays_nineteenCards_about53msApart', () => {
    const ids = Array.from({ length: 19 }, (_, i) => `c${i}`);
    const delays = [...dealDelays(ids).values()];
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBe(53);
    expect(delays[18]).toBe(947);
    for (let i = 1; i < delays.length; i++) expect(delays[i]!).toBeGreaterThan(delays[i - 1]!);
  });

  it('dealDelays_empty_emptyMap', () => {
    expect(dealDelays([]).size).toBe(0);
  });

  it('toNodes_revealDelay_setOnDealtCardsOnly', () => {
    const nodes = toNodes(fixtureBoard(fixtureStack(0, 0)), {
      ...UI,
      reveal: new Map([['goal-1', 200]]),
    });
    const data = (id: string) => nodes.find((n) => n.id === id)!.data as CardNodeData;
    expect(data('goal-1').reveal).toBe(200);
    expect(data('role-1').reveal).toBeNull();
    expect(data('conflict-1').reveal).toBeNull();
  });
});

describe('toNodes with a Core Loop card', () => {
  it('toNodes_loopCard_loopNodeWithWidthNoHeight', () => {
    const nodes = toNodes(onePagerWithLoop(), UI);
    const loop = nodes.find((node) => node.id === 'loop-1')!;
    expect(loop.type).toBe('loop');
    expect(loop.width).toBe(240);
    expect(loop.height).toBeUndefined();
    expect(loop.position).toEqual({ x: 624, y: 96 });
    expect(loop.data).toEqual({ cardId: 'loop-1', highlighted: false });
    expect(nodes.some((node) => node.type === 'card' && node.id === 'loop-1')).toBe(false);
  });

  it('toNodes_loopCard_ranksWithRootsByZ', () => {
    // Roots by z: hook-1 (1), modifier-1 (8), loop-1 (9); the loop card paints on top.
    const nodes = toNodes(onePagerWithLoop(), UI);
    expect(zOf(nodes, 'loop-1')).toBe(3 * 1000);
    expect(zOf(nodes, 'modifier-1')).toBe(2 * 1000);
    const lowered = onePagerWithLoop();
    const board = {
      ...lowered,
      cards: lowered.cards.map((c) => (c.id === 'loop-1' ? { ...c, z: 0 } : c)),
    };
    const again = toNodes(board, UI);
    expect(zOf(again, 'loop-1')).toBe(1000);
    expect(zOf(again, 'hook-1')).toBe(2000);
    const ids = again.map((n) => n.id);
    expect(ids.indexOf('loop-1')).toBeLessThan(ids.indexOf('hook-1'));
  });
});

describe('toNodes with the Questions panel', () => {
  const panelOf = (nodes: ReturnType<typeof toNodes>) =>
    nodes.find((node) => node.id === 'questions-panel');

  it('toNodes_onePager_oneQuestionsNodeBelowLoop', () => {
    const nodes = toNodes(onePagerWithLoop(), UI);
    expect(nodes.filter((node) => node.type === 'questions')).toHaveLength(1);
    const panel = panelOf(nodes)!;
    expect(panel.position).toEqual({ x: 624, y: 96 + 264 });
    expect(panel.width).toBe(240);
    expect(panel.height).toBeUndefined();
    expect(panel.data).toEqual({ width: 240, highlighted: false });
    // After the notes and the Concept panel, before every card.
    const ids = nodes.map((n) => n.id);
    expect(ids.indexOf('questions-panel')).toBe(ids.indexOf('concept-panel') + 1);
  });

  it('toNodes_questionsPos_panelAtSavedPlace', () => {
    const nodes = toNodes({ ...onePagerWithLoop(), questionsPos: { x: 960, y: 600 } }, UI);
    expect(panelOf(nodes)!.position).toEqual({ x: 960, y: 600 });
  });

  it('toNodes_freeForm_noQuestionsNode', () => {
    expect(panelOf(toNodes(fixtureBoard([fixtureCard('hook')]), UI))).toBeUndefined();
  });

  it('toNodes_questionsNode_draggableZIndex1', () => {
    const nodes = toNodes(onePagerWithLoop(), UI);
    const panel = panelOf(nodes)!;
    expect(panel.zIndex).toBe(1);
    expect(panel.draggable).toBe(true);
    expect(panel.selectable).toBe(false);
    expect(panel.focusable).toBe(false);
    const cardZ = nodes.filter((n) => n.type === 'card' || n.type === 'loop').map((n) => n.zIndex!);
    expect(Math.min(...cardZ)).toBeGreaterThan(1);
  });
});

describe('toNodes with a highlighted panel', () => {
  const dataOf = (nodes: ReturnType<typeof toNodes>, id: string) =>
    nodes.find((node) => node.id === id)!.data as { highlighted: boolean };

  it('toNodes_highlightedPanel_onlyThatNodeHighlighted', () => {
    const board = onePagerWithLoop();
    for (const [kind, id] of [
      ['concept', 'concept-panel'],
      ['loop', 'loop-1'],
      ['questions', 'questions-panel'],
    ] as const) {
      const nodes = toNodes(board, { ...UI, highlightedPanel: kind });
      expect(dataOf(nodes, id).highlighted, kind).toBe(true);
      const others = ['concept-panel', 'loop-1', 'questions-panel'].filter((o) => o !== id);
      for (const other of others) expect(dataOf(nodes, other).highlighted).toBe(false);
    }
  });

  it('toNodes_savedWidths_loopAndQuestionsNodesUseThem', () => {
    const base = onePagerWithLoop();
    const board = {
      ...base,
      questionsWidth: 400,
      cards: base.cards.map((c) => (c.id === 'loop-1' ? { ...c, width: 320 } : c)),
    };
    const nodes = toNodes(board, UI);
    expect(nodes.find((n) => n.id === 'loop-1')!.width).toBe(320);
    const panel = nodes.find((n) => n.id === 'questions-panel')!;
    expect(panel.width).toBe(400);
    expect(panel.data).toEqual({ width: 400, highlighted: false });
  });
});
