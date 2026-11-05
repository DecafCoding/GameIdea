/**
 * Tests for the board row summary and the relative time.
 */
import { describe, expect, it } from 'vitest';
import {
  fixtureBoard,
  fixtureCard,
  fixtureNote,
  fixtureStack,
  onePagerBoard,
  onePagerWithLoop,
} from '@/test/fixtures/boards';
import { editedAgo, metaLine, summarize } from './summary';

const NOW = new Date(2026, 5, 15, 12, 0, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('summary', () => {
  it('summarize_fixtureBoard_countsCardsNotesAndTypes', () => {
    const board = fixtureBoard(
      [...fixtureStack(0, 0), fixtureCard('setting', { x: 400 })],
      [fixtureNote()],
    );
    expect(summarize(board)).toEqual({
      id: 'fixture-board',
      name: 'Fixture Board',
      kind: 'free',
      updatedAt: board.updatedAt,
      cardCount: 4,
      noteCount: 1,
      hookCardCount: 0,
      hooks: [],
      firstHook: null,
      deckTypes: ['role', 'goal', 'conflict', 'setting'],
    });
  });

  const hookBoard = () =>
    fixtureBoard([
      fixtureCard('hook', { x: 0, y: 0 }),
      fixtureCard('role', { z: 2, tuckedUnder: 'hook-1' }),
      fixtureCard('goal', { z: 3, tuckedUnder: 'role-1' }),
    ]);

  it('summarize_onePager_kindOnePager', () => {
    expect(summarize(onePagerBoard()).kind).toBe('onePager');
  });

  it('summarize_hookStack_firstHookIsSentence', () => {
    const summary = summarize(hookBoard());
    expect(summary.hookCardCount).toBe(1);
    expect(summary.firstHook).toBe('You are a navigator to keep the light on.');
    expect(summary.hooks).toEqual([summary.firstHook]);
  });

  it('summarize_noHookCard_firstHookNull', () => {
    const summary = summarize(fixtureBoard([fixtureCard('role')]));
    expect(summary.hookCardCount).toBe(0);
    expect(summary.firstHook).toBeNull();
  });

  it('summarize_emptyHookCard_countsCardNoSentence', () => {
    const summary = summarize(fixtureBoard([fixtureCard('hook')]));
    expect(summary.hookCardCount).toBe(1);
    expect(summary.hooks).toEqual([]);
    expect(summary.firstHook).toBeNull();
  });

  it('summarize_deckTypes_distinctInDeckOrder', () => {
    const board = fixtureBoard([
      fixtureCard('constraint', { id: 'a' }),
      fixtureCard('role', { id: 'b' }),
      fixtureCard('hook', { id: 'c' }),
      fixtureCard('role', { id: 'd' }),
      fixtureCard('modifier', { id: 'e' }),
    ]);
    expect(summarize(board).deckTypes).toEqual(['hook', 'role', 'modifier', 'constraint']);
  });

  it('editedAgo_underAMinute_justNow', () => {
    expect(editedAgo(ago(30_000), NOW)).toBe('just now');
  });

  it('editedAgo_minutes_minutesAgo', () => {
    expect(editedAgo(ago(MIN), NOW)).toBe('1 minute ago');
    expect(editedAgo(ago(42 * MIN), NOW)).toBe('42 minutes ago');
  });

  it('editedAgo_hours_hoursAgo', () => {
    expect(editedAgo(ago(HOUR), NOW)).toBe('1 hour ago');
    expect(editedAgo(ago(11 * HOUR), NOW)).toBe('11 hours ago');
  });

  it('editedAgo_previousDay_yesterday', () => {
    expect(editedAgo(new Date(2026, 5, 14, 9, 0).toISOString(), NOW)).toBe('yesterday');
  });

  it('editedAgo_days_daysAgo', () => {
    expect(editedAgo(new Date(2026, 5, 10, 12, 0).toISOString(), NOW)).toBe('5 days ago');
  });

  it('editedAgo_overAMonth_shortDate', () => {
    const then = new Date(2026, 0, 3, 12, 0);
    expect(editedAgo(then.toISOString(), NOW)).toBe(
      then.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    );
  });

  it('metaLine_plurals_usePluralWords', () => {
    const summary = { ...summarize(fixtureBoard([])), cardCount: 8, hooks: ['A.', 'B.'] };
    expect(metaLine({ ...summary, updatedAt: ago(10 * MIN) }, NOW)).toBe(
      'Edited 10 minutes ago · 8 cards · 2 hooks',
    );
  });

  it('metaLine_oneHook_singular', () => {
    const summary = summarize(hookBoard());
    expect(metaLine({ ...summary, cardCount: 1, updatedAt: ago(1000) }, NOW)).toBe(
      'Edited just now · 1 card · 1 hook',
    );
  });

  it('metaLine_noHook_noHookYet', () => {
    const summary = summarize(fixtureBoard([fixtureCard('hook')]));
    expect(metaLine({ ...summary, updatedAt: ago(2 * HOUR) }, NOW)).toBe(
      'Edited 2 hours ago · 1 card · no hook yet',
    );
  });

  it('metaLine_imported_verb', () => {
    const summary = { ...summarize(fixtureBoard([])), cardCount: 2 };
    expect(metaLine({ ...summary, updatedAt: ago(1000) }, NOW, 'Imported')).toBe(
      'Imported just now · 2 cards · no hook yet',
    );
  });
});

describe('summary and the Core Loop card', () => {
  it('summarize_loopCard_notCountedNoDot', () => {
    const withLoop = summarize(onePagerWithLoop());
    const without = summarize(onePagerBoard());
    expect(withLoop.cardCount).toBe(without.cardCount);
    expect(withLoop.deckTypes).toEqual(without.deckTypes);
  });
});
