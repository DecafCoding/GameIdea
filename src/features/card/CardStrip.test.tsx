/**
 * Tests for the card strip.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardStrip } from './CardStrip';

const noop = () => {};
const handlers = {
  onSplit: noop,
  onRedraw: noop,
  onDuplicate: noop,
  onLock: noop,
  onDiscard: noop,
};
/** Each button's name: its text, or its aria-label for the icon-only Lock button. */
const names = () =>
  screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);

describe('CardStrip', () => {
  it('cardStrip_uncombined_hasNoSplit', () => {
    render(<CardStrip canSplit={false} locked={false} {...handlers} />);
    expect(screen.queryByRole('button', { name: 'Split' })).toBeNull();
    expect(names()).toEqual(['Redraw', 'Duplicate', 'Lock', 'Discard']);
  });

  it('cardStrip_combined_itemsInDesignOrderAndSplitCalls', () => {
    const onSplit = vi.fn();
    render(<CardStrip canSplit locked={false} {...handlers} onSplit={onSplit} />);
    expect(names()).toEqual(['Split', 'Redraw', 'Duplicate', 'Lock', 'Discard']);
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

  it('cardStrip_lock_isIconOnly', () => {
    render(<CardStrip canSplit={false} locked={false} {...handlers} />);
    const lock = screen.getByRole('button', { name: 'Lock' });
    expect(lock.textContent).toBe('');
    expect(lock.querySelector('[data-icon="lock"]')).not.toBeNull();
  });

  it('cardStrip_duplicate_calls', () => {
    const onDuplicate = vi.fn();
    render(<CardStrip canSplit={false} locked={false} {...handlers} onDuplicate={onDuplicate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });
});
