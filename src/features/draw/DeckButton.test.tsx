/**
 * Tests for the rail's deck button.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckButton, HookButton } from './DeckButton';

describe('DeckButton', () => {
  it('deckButton_click_drawsItsDeck', () => {
    const onDraw = vi.fn();
    render(<DeckButton type="mechanic" disabled={false} onDraw={onDraw} />);
    fireEvent.click(screen.getByRole('button', { name: 'Draw A Mechanic' }));
    expect(onDraw).toHaveBeenCalledWith('mechanic', expect.anything(), undefined);
  });

  it('hookButton_disabled_noDraw', () => {
    const onDraw = vi.fn();
    render(<HookButton onDraw={onDraw} disabled />);
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Draw A Hook Card' });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onDraw).not.toHaveBeenCalled();
  });
});
