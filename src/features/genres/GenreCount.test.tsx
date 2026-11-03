/**
 * Tests for the genre count pill.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GenreCount } from './GenreCount';

describe('GenreCount', () => {
  it('genreCount_all21_rendersNothing', () => {
    const { container } = render(<GenreCount count={21} />);
    expect(container.innerHTML).toBe('');
  });

  it('genreCount_three_showsNumberAndLabel', () => {
    render(<GenreCount id="pill" count={3} />);
    const pill = screen.getByRole('img', { name: '3 genres on' });
    expect(pill.textContent).toBe('3');
    expect(pill.id).toBe('pill');
  });

  it('genreCount_one_singularLabel', () => {
    render(<GenreCount count={1} />);
    expect(screen.getByRole('img', { name: '1 genre on' })).toBeTruthy();
  });
});
