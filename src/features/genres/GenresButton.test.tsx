/**
 * Tests for the rail's Genres button and its count line.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { allGenresOn } from '@/shared/model';
import { GenresButton } from './GenresButton';

describe('GenresButton', () => {
  it('genresButton_allOn_readsAllGenres', () => {
    render(<GenresButton genres={allGenresOn()} onOpen={() => undefined} />);
    const button = screen.getByRole('button', { name: 'Genres' });
    expect(button.textContent).toContain('All genres');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('genresButton_unionOfThree_readsThreeGenres', () => {
    const genres = {
      mechanic: ['puzzle' as const],
      resource: ['rpg' as const],
      progression: ['puzzle' as const, 'horror' as const],
      constraint: ['rpg' as const],
    };
    render(<GenresButton genres={genres} onOpen={() => undefined} />);
    expect(screen.getByText('3 genres')).toBeTruthy();
  });

  it('genresButton_click_callsOnOpen', () => {
    const onOpen = vi.fn();
    render(<GenresButton genres={allGenresOn()} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Genres' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
