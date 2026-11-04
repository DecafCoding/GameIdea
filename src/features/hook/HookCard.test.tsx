/**
 * Tests for the Hook Card view: the New state and the sentence.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HOOK_NEW_TEXT, HookCard } from './HookCard';

describe('HookCard', () => {
  it('hookCard_empty_showsNewStateAndSlot', () => {
    render(<HookCard sentence="" empty />);
    expect(screen.getByTestId('hook-sentence').textContent).toBe(HOOK_NEW_TEXT);
    expect(screen.getByTestId('hook-slot').textContent).toBe('Player Role goes here');
    expect(screen.getByRole('article', { name: 'Hook Card' })).toBeTruthy();
  });

  it('hookCard_sentence_rendersText', () => {
    render(<HookCard sentence="You are a pilot." empty={false} />);
    expect(screen.getByTestId('hook-sentence').textContent).toBe('You are a pilot.');
    expect(screen.queryByTestId('hook-slot')).toBeNull();
    expect(screen.getByText('Hook')).toBeTruthy();
  });

  it('hookCard_sentence_isSelectableNotDragHandle', () => {
    render(<HookCard sentence="You are a pilot." empty={false} />);
    const text = screen.getByTestId('hook-sentence');
    expect(text.classList.contains('nodrag')).toBe(true);
    expect(text.classList.contains('nopan')).toBe(true);
  });
});
