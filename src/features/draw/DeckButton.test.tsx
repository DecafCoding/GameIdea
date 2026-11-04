/**
 * Tests for the rail's deck button.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeckButton, HookButton } from './DeckButton';

describe('DeckButton', () => {
  it('deckButton_trailing_rendersInsideAndKeepsLabel', () => {
    render(
      <DeckButton
        type="mechanic"
        disabled={false}
        onDraw={() => undefined}
        trailing={<span id="pill">3</span>}
        describedBy="pill"
      />,
    );
    const button = screen.getByRole('button', { name: 'Draw A Mechanic' });
    expect(button.contains(document.getElementById('pill'))).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe('pill');
  });

  it('deckButton_noTrailing_noDescription', () => {
    render(<DeckButton type="mechanic" disabled={false} onDraw={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Draw A Mechanic' });
    expect(button.hasAttribute('aria-describedby')).toBe(false);
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
