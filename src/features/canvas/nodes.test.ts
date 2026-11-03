/**
 * Tests for board → React Flow nodes: z order.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, fixtureCard, fixtureNote, fixtureStack } from '@/test/fixtures/boards';
import { toNodes, type CardNodeData } from './nodes';

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
});
