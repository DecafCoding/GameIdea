/**
 * Tests for the Hook Card menu: disabled items, the "Copied" state and the fallback dialog.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COPY_BLOCKED_TEXT } from './CopyFallbackDialog';
import { COPIED_MS, HookMenu } from './HookMenu';

const noop = () => {};
const SENTENCE = 'You are a pilot who must fly.';

afterEach(() => {
  vi.useRealTimers();
});

function renderMenu(props: Partial<Parameters<typeof HookMenu>[0]> = {}) {
  return render(
    <HookMenu
      sentence={SENTENCE}
      hasStack
      poolsReady
      visible
      onRedrawAll={noop}
      onDuplicate={noop}
      onDiscard={noop}
      {...props}
    />,
  );
}

describe('HookMenu', () => {
  it('hookMenu_itemsInDesignOrder', () => {
    renderMenu();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Copy',
      'Redraw All',
      'Duplicate',
      'Discard',
    ]);
  });

  it('hookMenu_emptyHook_disablesCopyAndRedrawAll', () => {
    renderMenu({ hasStack: false });
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Redraw All' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveProperty('disabled', false);
  });

  it('hookMenu_poolsNotReady_disablesRedrawAllOnly', () => {
    renderMenu({ poolsReady: false });
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Redraw All' })).toHaveProperty('disabled', true);
  });

  it('hookMenu_afterCopy_showsCopiedFor2s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    renderMenu({ clipboard: { writeText } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(SENTENCE);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(COPIED_MS - 1);
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('hookMenu_blocked_opensFallbackWithTextSelected', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('blocked')));
    renderMenu({ clipboard: { writeText } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await Promise.resolve();
    });
    const dialog = await screen.findByRole('dialog', { name: 'Copy The Hook' });
    expect(dialog.textContent).toContain(COPY_BLOCKED_TEXT);
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Hook Sentence' });
    expect(field.value).toBe(SENTENCE);
    expect(field.readOnly).toBe(true);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(SENTENCE.length);
  });

  it('hookMenu_redrawAllAndDiscard_callBack', () => {
    const onRedrawAll = vi.fn();
    const onDiscard = vi.fn();
    renderMenu({ onRedrawAll, onDiscard });
    fireEvent.click(screen.getByRole('button', { name: 'Redraw All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onRedrawAll).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
