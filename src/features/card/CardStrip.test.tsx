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
/** Each button's name: its aria-label (every item is icon-only). */
const names = () => screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
const iconOf = (button: HTMLElement) =>
  button.querySelector('[data-icon]')?.getAttribute('data-icon');

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

  it('cardStrip_items_areIconsWithTooltips', () => {
    render(<CardStrip canSplit locked={false} {...handlers} />);
    const buttons = screen.getAllByRole('button');
    for (const b of buttons) {
      expect(b.textContent).toBe('');
      expect(b.title).toBe(b.getAttribute('aria-label'));
    }
    expect(buttons.map(iconOf)).toEqual([
      'split',
      'playing-cards-fan',
      'copy',
      'lock-open',
      'trash',
    ]);
  });

  it('cardStrip_unlockedCard_showsOpenLock', () => {
    render(<CardStrip canSplit={false} locked={false} {...handlers} />);
    const lock = screen.getByRole('button', { name: 'Lock' });
    expect(lock.getAttribute('aria-pressed')).toBe('false');
    expect(iconOf(lock)).toBe('lock-open');
  });

  it('cardStrip_lockedCard_showsClosedLock', () => {
    render(<CardStrip canSplit={false} locked {...handlers} />);
    expect(iconOf(screen.getByRole('button', { name: 'Unlock' }))).toBe('lock');
  });

  it('cardStrip_duplicate_calls', () => {
    const onDuplicate = vi.fn();
    render(<CardStrip canSplit={false} locked={false} {...handlers} onDuplicate={onDuplicate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onDuplicate).toHaveBeenCalledOnce();
  });
});
