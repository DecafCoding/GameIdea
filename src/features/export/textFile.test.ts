/**
 * Tests for the text file layout: active pairs, turned rings, stacks, joined Modifiers,
 * order and notes.
 */
import { describe, expect, it } from 'vitest';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
  secondModifier,
} from '@/test/fixtures/boards';
import { boardText, textFileName } from './textFile';

function named(board: ReturnType<typeof fixtureBoard>) {
  return { ...board, name: 'Salvage Run' };
}

describe('textFile', () => {
  it('boardText_emptyBoard_nameOnly', () => {
    expect(boardText(named(fixtureBoard([], [fixtureNote({ text: '  ' })])))).toBe('Salvage Run\n');
  });

  it('boardText_combinedCard_writesActivePair', () => {
    expect(boardText(named(fixtureBoard([combinedCard('role')])))).toBe(
      'Salvage Run\n\nCards\n\nPlayer Role: exiled navigator\n',
    );
  });

  it('boardText_turnedRing_writesBottomCue', () => {
    const card = fixtureCard('setting', {
      rings: [{ ...fixtureCard('setting').rings[0]!, activeIndex: 2 }],
    });
    expect(boardText(named(fixtureBoard([card])))).toBe(
      'Salvage Run\n\nCards\n\nSetting: eclipse\n',
    );
  });

  it('boardText_chainStack_indentsTuckedCards', () => {
    expect(boardText(named(fixtureBoard(fixtureStack(0, 0))))).toBe(
      'Salvage Run\n\nCards\n\n' +
        'Player Role: navigator\n' +
        '  Goal: keep the light on\n' +
        '    Conflict: the tide rises every night\n',
    );
  });

  it('boardText_tuckedModifier_joinsParentLine', () => {
    const [role, goal, conflict] = fixtureStack(0, 0);
    const combined = combinedCard('role', { id: role!.id, z: role!.z });
    const devout = secondModifier({ tuckedUnder: role!.id, z: 9 });
    // A Modifier with its own tucked card keeps its own line.
    const exiled = fixtureCard('modifier', { id: 'modifier-3', x: 500, z: 10 });
    const under = fixtureCard('goal', { id: 'goal-9', tuckedUnder: exiled.id });
    const board = fixtureBoard([combined, goal!, conflict!, devout, exiled, under]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nCards\n\n' +
        'Player Role: exiled navigator, devout\n' +
        '  Goal: keep the light on\n' +
        '    Conflict: the tide rises every night\n' +
        'Player Role Modifier: exiled\n' +
        '  Goal: keep the light on\n',
    );
  });

  it('boardText_onTopModifier_readsInBaseLine', () => {
    const board = fixtureBoard([
      combinedCard('role', { x: 0, y: 0 }),
      secondModifier({ x: 900, y: 900, onTopOf: 'role-1' }),
    ]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nCards\n\nPlayer Role: devout exiled navigator\n',
    );
  });

  it('boardText_hookStack_hooksSectionBeforeCards', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      fixtureCard('role', { x: 20, y: 56, z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('mechanic', { x: 20, y: 112, z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('modifier', { x: 600, y: 0, z: 4, modDeck: 'setting' }),
    ]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nHooks\n\nYou are a navigator who must trade.\n\nCards\n\n' +
        'Hook Card\n' +
        '  Player Role: navigator\n' +
        '    Mechanic: trade\n' +
        'Setting Modifier: exiled\n',
    );
  });

  it('boardText_rootsByPosition_topToBottomThenLeftToRight', () => {
    const board = fixtureBoard([
      fixtureCard('conflict', { id: 'c', x: 0, y: 300 }),
      fixtureCard('setting', { id: 's', x: 400, y: 0 }),
      fixtureCard('role', { id: 'h', x: 0, y: 0 }),
    ]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nCards\n\n' +
        'Player Role: navigator\n' +
        'Setting: outpost\n' +
        'Conflict: the tide rises every night\n',
    );
  });

  it('boardText_notes_keepLineBreaksSkipBlank', () => {
    const board = fixtureBoard(
      [],
      [
        fixtureNote({ id: 'n2', y: 400, text: 'A second note.  ' }),
        fixtureNote({ id: 'n0', y: 200, text: ' \n ' }),
        fixtureNote({
          id: 'n1',
          y: 0,
          text: 'The fleet left without her.  \nShe has one ship and no map.\n',
        }),
      ],
    );
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nNotes\n\n' +
        'Note\nThe fleet left without her.\nShe has one ship and no map.\n\n' +
        'Note\nA second note.\n',
    );
  });

  it('boardText_twoHooks_oneParagraphEach', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { id: 'h1', x: 0, y: 0 }),
      fixtureCard('role', { z: 2, tuckedUnder: 'h1' }),
      fixtureCard('mood', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('hook', { id: 'h2', x: 0, y: 600 }),
      fixtureCard('goal', { z: 4, tuckedUnder: 'h2' }),
    ]);
    const text = boardText(named(board));
    const hooks = text.split('\n\nCards\n\n')[0]!.split('Hooks\n\n')[1]!.split('\n\n');
    expect(hooks).toHaveLength(2);
    // A 2-sentence hook stays one paragraph.
    expect(hooks[0]).toMatch(/^You are a navigator\. .+\.$/);
    expect(hooks[0]).not.toContain('\n');
    expect(hooks[1]).toBe('To keep the light on.');
  });

  it('boardText_emptyHookCard_noHooksSection', () => {
    expect(boardText(named(fixtureBoard([fixtureCard('hook')])))).toBe(
      'Salvage Run\n\nCards\n\nHook Card\n',
    );
  });

  it('boardText_noHookCard_noHooksSection', () => {
    expect(boardText(named(fixtureBoard([fixtureCard('goal')])))).not.toContain('Hooks');
  });

  it('textFileName_badCharacters_replaced', () => {
    expect(textFileName('Salvage: Run?')).toBe('Salvage- Run-.txt');
    expect(textFileName(' ')).toBe('Untitled Board.txt');
  });
});
