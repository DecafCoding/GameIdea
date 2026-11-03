/**
 * Tests for the text file layout: active pairs, turned rings, stacks, joined Descriptions,
 * order and notes.
 */
import { describe, expect, it } from 'vitest';
import {
  combinedCard,
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
  secondDescription,
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
    expect(boardText(named(fixtureBoard([combinedCard('character')])))).toBe(
      'Salvage Run\n\nCards\n\nCharacter: exiled navigator\n',
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
        'Character: navigator\n' +
        '  Motivation: wants to go home\n' +
        '    Conflict: but the ship is dying\n',
    );
  });

  it('boardText_tuckedDescription_joinsParentLine', () => {
    const [character, motivation, conflict] = fixtureStack(0, 0);
    const combined = combinedCard('character', { id: character!.id, z: character!.z });
    const devout = secondDescription({ tuckedUnder: character!.id, z: 9 });
    // A Description with its own tucked card keeps its own line.
    const exiled = fixtureCard('description', { id: 'description-3', x: 500, z: 10 });
    const under = fixtureCard('motivation', { id: 'motivation-9', tuckedUnder: exiled.id });
    const board = fixtureBoard([combined, motivation!, conflict!, devout, exiled, under]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nCards\n\n' +
        'Character: exiled navigator, devout\n' +
        '  Motivation: wants to go home\n' +
        '    Conflict: but the ship is dying\n' +
        'Description: exiled\n' +
        '  Motivation: wants to go home\n',
    );
  });

  it('boardText_rootsByPosition_topToBottomThenLeftToRight', () => {
    const board = fixtureBoard([
      fixtureCard('conflict', { id: 'c', x: 0, y: 300 }),
      fixtureCard('setting', { id: 's', x: 400, y: 0 }),
      fixtureCard('character', { id: 'h', x: 0, y: 0 }),
    ]);
    expect(boardText(named(board))).toBe(
      'Salvage Run\n\nCards\n\n' +
        'Character: navigator\n' +
        'Setting: outpost\n' +
        'Conflict: but the ship is dying\n',
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

  it('textFileName_badCharacters_replaced', () => {
    expect(textFileName('Salvage: Run?')).toBe('Salvage- Run-.txt');
    expect(textFileName(' ')).toBe('Untitled Board.txt');
  });
});
