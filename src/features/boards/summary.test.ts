/**
 * Tests for the board row summary and the relative time.
 */
import { describe, expect, it } from 'vitest';
import { fixtureBoard, fixtureCard, fixtureNote, fixtureStack } from '@/test/fixtures/boards';
import { editedAgo, rowCaption, summarize } from './summary';

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
      updatedAt: board.updatedAt,
      cardCount: 4,
      noteCount: 1,
      typeStrip: ['character', 'motivation', 'conflict', 'setting'],
    });
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

  it('rowCaption_plurals_usePluralWords', () => {
    const summary = { ...summarize(fixtureBoard([])), cardCount: 5, noteCount: 2 };
    expect(rowCaption({ ...summary, updatedAt: ago(2 * HOUR) }, NOW)).toBe(
      '5 cards · 2 notes · edited 2 hours ago',
    );
  });

  it('rowCaption_singulars_useSingularWords', () => {
    const summary = { ...summarize(fixtureBoard([])), cardCount: 1, noteCount: 1 };
    expect(rowCaption({ ...summary, updatedAt: ago(1000) }, NOW)).toBe(
      '1 card · 1 note · edited just now',
    );
  });

  it('rowCaption_imported_usesImportedVerb', () => {
    const summary = { ...summarize(fixtureBoard([])), cardCount: 2, noteCount: 0 };
    expect(rowCaption({ ...summary, updatedAt: ago(1000) }, NOW, 'imported')).toBe(
      '2 cards · 0 notes · imported just now',
    );
  });
});
