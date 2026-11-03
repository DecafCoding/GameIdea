/**
 * Tests for the card strip.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardStrip } from './CardStrip';

const noop = () => {};
const handlers = { onSplit: noop, onRedraw: noop, onLock: noop, onDiscard: noop };

describe('CardStrip', () => {
  it('cardStrip_uncombined_hasNoSplit', () => {
    render(<CardStrip canSplit={false} locked={false} {...handlers} />);
    expect(screen.queryByRole('button', { name: 'Split' })).toBeNull();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Redraw',
      'Lock',
      'Discard',
    ]);
  });

  it('cardStrip_combined_itemsInDesignOrderAndSplitCalls', () => {
    const onSplit = vi.fn();
    render(<CardStrip canSplit locked={false} {...handlers} onSplit={onSplit} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Split',
      'Redraw',
      'Lock',
      'Discard',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    expect(onSplit).toHaveBeenCalledOnce();
  });

  it('cardStrip_lockedCard_showsUnlock', () => {
    const onLock = vi.fn();
    render(<CardStrip canSplit={false} locked {...handlers} onLock={onLock} />);
    const button = screen.getByRole('button', { name: 'Unlock' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onLock).toHaveBeenCalledOnce();
  });
});
