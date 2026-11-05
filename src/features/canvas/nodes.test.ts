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
    expect(panel.position).toEqual({ x: 392, y: 96 });
    expect(panel.data).toEqual({ width: 300 });
    expect(panel.zIndex).toBe(1);
    expect(panel.draggable).toBe(false);
    // Above notes, below every card.
    const cardZ = nodes.filter((n) => n.type === 'card').map((n) => n.zIndex ?? 0);
    expect(Math.min(...cardZ)).toBeGreaterThan(1);
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
