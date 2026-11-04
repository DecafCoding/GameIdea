/**
 * Tests for the GenresPanel wrapper, kept for one step until the Settings Genres tab replaces it.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { allGenresOn } from '@/shared/model';
import { GenresPanel } from './GenresPanel';
import { GENRES_SCOPE_TEXT } from './GenresTab';

describe('GenresPanel', () => {
  it('genresPanel_open_showsScopeLineTabBodyAndClosesOnDone', () => {
    const onClose = vi.fn();
    render(<GenresPanel genres={allGenresOn()} onChange={() => undefined} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Genres' })).toBeTruthy();
    expect(screen.getByText(GENRES_SCOPE_TEXT)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'All 4 Decks' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
