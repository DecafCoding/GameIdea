/**
 * Tests for the rail's Edit Genres button.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GenreButton } from './GenreButton';

describe('GenreButton', () => {
  it('genreButton_all21_showsDramaIcon', () => {
    render(<GenreButton deck="mechanic" count={21} onEdit={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Edit Mechanic Genres, all genres on' });
    expect(button.textContent).toBe('');
    expect(button.querySelector('[data-icon="drama"]')).not.toBeNull();
    expect(button.getAttribute('title')).toBe('Edit Genres');
  });

  it('genreButton_three_showsNumberOnly', () => {
    render(<GenreButton deck="resource" count={3} onEdit={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Edit Resource Genres, 3 genres on' });
    expect(button.textContent).toBe('3');
    expect(button.querySelector('[data-icon]')).toBeNull();
  });

  it('genreButton_one_singularLabel', () => {
    render(<GenreButton deck="constraint" count={1} onEdit={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Edit Constraint Genres, 1 genre on' })).toBeTruthy();
  });

  it('genreButton_click_callsOnEdit', () => {
    const onEdit = vi.fn();
    render(<GenreButton deck="progression" count={21} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: /^Edit Progression Genres/ }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
