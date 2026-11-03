/**
 * Tests for the rail's deck button.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeckButton } from './DeckButton';

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
});
