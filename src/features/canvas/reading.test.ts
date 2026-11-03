/**
 * Tests for reading a board: On Top links and card text, and the feature brief's example
 * walked on one board.
 */
import { describe, expect, it } from 'vitest';
import { iconFor } from '@/features/card';
import { buildHookSentence } from '@/features/hook';
import { fixtureBoard, fixtureCard } from '@/test/fixtures/boards';
import type { Board, Card } from '@/shared/model';
import { dropCard, splitCard } from './boardActions';
import { hintFor } from './dropZones';
import { cardText, hookSentences, isOnTop, onTopCardOf, stackEntries } from './reading';

const cue = (texts: string[]) => ({ cues: texts.map((text) => ({ text })), activeIndex: 0 });
const get = (board: Board, id: string): Card => board.cards.find((c) => c.id === id)!;

describe('reading', () => {
  it('onTopCardOf_and_isOnTop_followTheLink', () => {
    const base = fixtureCard('role');
    const onTop = fixtureCard('modifier', { id: 'top', onTopOf: 'role-1' });
    const dangling = fixtureCard('modifier', { id: 'loose', onTopOf: 'gone' });
    const board = fixtureBoard([base, onTop, dangling]);
    expect(onTopCardOf(board, 'role-1')?.id).toBe('top');
    expect(isOnTop(board, onTop)).toBe(true);
    expect(isOnTop(board, dangling)).toBe(false);
    expect(isOnTop(board, base)).toBe(false);
  });

  it('cardText_nonBaseCard_isActiveText', () => {
    const goal = fixtureCard('goal');
    expect(cardText(fixtureBoard([goal]), goal)).toBe('keep the light on');
  });

  it('feature_modifierExample_readsAsBrief', () => {
    let board = fixtureBoard([
      fixtureCard('role', { id: 'pilot', rings: [cue(['pilot', 'diver', 'medic', 'scout'])] }),
      fixtureCard('modifier', {
        id: 'frozen',
        x: 480,
        z: 2,
        modDeck: 'setting',
        rings: [cue(['frozen', 'sunken', 'silent', 'flooded'])],
      }),
      fixtureCard('modifier', {
        id: 'tall',
        x: 960,
        z: 3,
        modDeck: 'role',
        rings: [cue(['tall', 'brave', 'old', 'quiet'])],
      }),
      fixtureCard('modifier', {
        id: 'third',
        x: 1440,
        z: 4,
        modDeck: 'resource',
        rings: [cue(['rusty', 'stolen', 'spare', 'shiny'])],
      }),
    ]);
    // "frozen" anywhere on the plain card merges.
    board = dropCard(board, 'frozen', { x: 100, y: 150 }, { x: 0, y: 0 });
    expect(cardText(board, get(board, 'pilot'))).toBe('frozen pilot');
    // "tall" in the top band goes on top.
    board = dropCard(board, 'tall', { x: 100, y: 20 }, { x: 0, y: 0 });
    expect(cardText(board, get(board, 'pilot'))).toBe('tall frozen pilot');
    // A third Modifier over the card gets only the swap zone.
    const third = get(board, 'third');
    expect(hintFor(board, third, get(board, 'pilot'), { x: 100, y: 20 })).toBe('swapOnly');
    // Split takes the merged ring off; the On Top adjective stays.
    board = splitCard(board, 'pilot', () => 'split');
    expect(cardText(board, get(board, 'pilot'))).toBe('tall pilot');
    expect(iconFor(get(board, 'split'))).toBe('map-pin-plus');
    // With no merged ring, the next Modifier merges again.
    expect(hintFor(board, third, get(board, 'pilot'), { x: 100, y: 20 })).toBe('combine');
  });
});

describe('stackEntries', () => {
  const hookStack = (...cards: Card[]) =>
    fixtureBoard([fixtureCard('hook', { x: 0, y: 0 }), ...cards]);

  it('stackEntries_siblings_readInStackOrder', () => {
    const board = hookStack(
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { z: 4, tuckedUnder: 'role-1' }),
      fixtureCard('mechanic', { z: 3, tuckedUnder: 'role-1' }),
    );
    const entries = stackEntries(board, 'hook-1');
    expect(entries.map((entry) => entry.type)).toEqual(['role', 'mechanic', 'goal']);
    // The Goal reads after the Mechanic, which is the card just before it in stack order.
    expect(entries[2]).toEqual({ type: 'goal', connector: 'to', activeText: 'keep the light on' });
  });

  it('stackEntries_roleUnderHookVowel_youAreAn', () => {
    const board = hookStack(
      fixtureCard('role', {
        z: 2,
        tuckedUnder: 'hook-1',
        rings: [cue(['astronaut', 'pilot', 'medic', 'scout'])],
      }),
    );
    expect(stackEntries(board, 'hook-1')).toEqual([
      { type: 'role', connector: 'You are an', activeText: 'astronaut' },
    ]);
  });

  it('stackEntries_savedWordNotInList_usesDefault', () => {
    const board = hookStack(
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1', connector: 'aboard the' }),
      fixtureCard('mechanic', { z: 3, tuckedUnder: 'role-1', connector: 'who learns to' }),
    );
    expect(stackEntries(board, 'hook-1').map((entry) => entry.connector)).toEqual([
      'You are a',
      'who learns to',
    ]);
  });

  it('stackEntries_fullFixtureStack_readsExampleSentence', () => {
    const board = hookStack(
      fixtureCard('role', {
        z: 2,
        tuckedUnder: 'hook-1',
        rings: [cue(['lighthouse keeper', 'a', 'b', 'c'])],
      }),
      fixtureCard('mechanic', { z: 3, tuckedUnder: 'role-1' }),
      fixtureCard('resource', { z: 4, tuckedUnder: 'mechanic-1' }),
      fixtureCard('goal', { z: 5, tuckedUnder: 'resource-1' }),
      fixtureCard('conflict', { z: 6, tuckedUnder: 'goal-1' }),
    );
    expect(buildHookSentence(stackEntries(board, 'hook-1'))).toBe(
      'You are a lighthouse keeper who must trade using memories to keep the light on, but the tide rises every night.',
    );
  });
});

describe('hookSentences', () => {
  it('hookSentences_noHookCard_empty', () => {
    expect(hookSentences(fixtureBoard([fixtureCard('role')]))).toEqual([]);
  });

  it('hookSentences_emptyHookCard_skipped', () => {
    expect(hookSentences(fixtureBoard([fixtureCard('hook')]))).toEqual([]);
  });

  it('hookSentences_twoHooks_readingOrderTopThenLeft', () => {
    const board = fixtureBoard([
      fixtureCard('hook', { id: 'low', x: 0, y: 600 }),
      fixtureCard('goal', { id: 'g-low', z: 2, tuckedUnder: 'low' }),
      fixtureCard('hook', { id: 'right', x: 900, y: 0 }),
      fixtureCard('conflict', { id: 'c-right', z: 3, tuckedUnder: 'right' }),
      fixtureCard('hook', { id: 'left', x: 0, y: 0 }),
      fixtureCard('role', { id: 'r-left', z: 4, tuckedUnder: 'left' }),
    ]);
    expect(hookSentences(board)).toEqual([
      'You are a navigator.',
      'But the tide rises every night.',
      'To keep the light on.',
    ]);
  });

  it('hookSentences_matchesHookCardSentence', () => {
    const board = fixtureBoard([
      fixtureCard('hook'),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { z: 3, tuckedUnder: 'role-1' }),
    ]);
    expect(hookSentences(board)).toEqual([buildHookSentence(stackEntries(board, 'hook-1'))]);
  });
});
