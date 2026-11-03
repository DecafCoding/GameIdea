/**
 * Tests for the card strip.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardStrip } from './CardStrip';

const noop = () => {};

describe('CardStrip', () => {
  it('cardStrip_uncombined_hasNoSplit', () => {
    render(<CardStrip combined={false} onSplit={noop} onRedraw={noop} onDiscard={noop} />);
    expect(screen.queryByRole('button', { name: 'Split' })).toBeNull();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Redraw', 'Discard']);
  });

  it('cardStrip_combined_splitFirstAndCalls', () => {
    const onSplit = vi.fn();
    render(<CardStrip combined onSplit={onSplit} onRedraw={noop} onDiscard={noop} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Split',
      'Redraw',
      'Discard',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(onSplit).toHaveBeenCalledOnce();
  });
});
