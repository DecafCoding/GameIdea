/**
 * Tests for the Core Loop menu: Copy Loop and Reset From Cards, the disabled copy, the
 * "Copied" state and the fallback dialog.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPIED_MS, COPY_BLOCKED_TEXT } from '@/features/hook';
import { LoopMenu } from './LoopMenu';

const TEXT = 'summon → earn clues';

afterEach(() => {
  vi.useRealTimers();
});

function renderMenu(props: Partial<Parameters<typeof LoopMenu>[0]> = {}) {
  return render(<LoopMenu text={TEXT} hasLoopText={false} visible onReset={vi.fn()} {...props} />);
}

const iconOf = (button: HTMLElement) =>
  button.querySelector('[data-icon]')?.getAttribute('data-icon');

describe('LoopMenu', () => {
  it('loopMenu_noLoopText_onlyCopyLoop', () => {
    renderMenu();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Copy Loop',
    ]);
  });

  it('loopMenu_loopText_copyThenReset', () => {
    renderMenu({ hasLoopText: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Copy Loop',
      'Reset From Cards',
    ]);
    for (const b of buttons) {
      expect(b.title).toBe(b.getAttribute('aria-label'));
      expect(b.textContent).toBe('');
    }
    expect(buttons.map(iconOf)).toEqual(['repeat', 'square-arrow-down']);
    expect(screen.queryByRole('button', { name: 'Duplicate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
  });

  it('loopMenu_emptyText_copyDisabled', () => {
    renderMenu({ text: '' });
    expect(screen.getByRole('button', { name: 'Copy Loop' })).toHaveProperty('disabled', true);
  });

  it('loopMenu_copy_writesShownTextAndShowsCopied', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    renderMenu({ clipboard: { writeText } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy Loop' }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(iconOf(screen.getByRole('button', { name: 'Copied' }))).toBe('check');
    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(iconOf(screen.getByRole('button', { name: 'Copy Loop' }))).toBe('repeat');
  });

  it('loopMenu_copyBlocked_opensFallbackDialog', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('blocked')));
    renderMenu({ clipboard: { writeText } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy Loop' }));
      await Promise.resolve();
    });
    const dialog = await screen.findByRole('dialog', { name: 'Copy The Loop' });
    expect(dialog.textContent).toContain(COPY_BLOCKED_TEXT);
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Core Loop' });
    expect(field.value).toBe(TEXT);
    expect(field.readOnly).toBe(true);
  });

  it('loopMenu_reset_callsHandler', () => {
    const onReset = vi.fn();
    renderMenu({ hasLoopText: true, onReset });
    fireEvent.click(screen.getByRole('button', { name: 'Reset From Cards' }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('loopMenu_hidden_buttonsNotTabbable', () => {
    renderMenu({ visible: false, hasLoopText: true });
    for (const b of screen.getAllByRole('button', { hidden: true })) {
      expect(b.tabIndex).toBe(-1);
    }
  });
});
