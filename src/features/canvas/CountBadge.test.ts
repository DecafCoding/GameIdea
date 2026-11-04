/**
 * Tests for the footer count texts on both board kinds.
 */
import { describe, expect, it } from 'vitest';
import { countText, onePagerCountText } from './CountBadge';

describe('CountBadge texts', () => {
  it('onePagerCountText_twelve_matchesDesign', () => {
    expect(onePagerCountText(12)).toBe('12 cards · 1 hook · 1 concept');
  });

  it('onePagerCountText_one_singular', () => {
    expect(onePagerCountText(1)).toBe('1 card · 1 hook · 1 concept');
  });

  it('countText_freeForm_unchanged', () => {
    expect(countText(8, 1)).toBe('8 cards · 1 note');
  });
});
