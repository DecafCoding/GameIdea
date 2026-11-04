/**
 * Tests for the Genres tab body: chips, deck rows, the last-genre guard and All On.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { allGenresOn, GENRE_DECKS, type DeckGenres } from '@/shared/model';
import { GenresTab } from './GenresTab';

function Harness({
  initial,
  onChange = () => undefined,
}: {
  initial: DeckGenres;
  onChange?: (genres: DeckGenres) => void;
}) {
  const [genres, setGenres] = useState(initial);
  return (
    <GenresTab
      genres={genres}
      onChange={(next) => {
        setGenres(next);
        onChange(next);
      }}
    />
  );
}

/** The genres passed to the first onChange call. */
function firstChange(onChange: ReturnType<typeof vi.fn>): DeckGenres {
  const call = onChange.mock.calls[0];
  if (!call) throw new Error('onChange was not called');
  return call[0] as DeckGenres;
}

const top = () => within(screen.getByRole('region', { name: 'All 4 Decks' }));
const row = (name: string) => within(screen.getByRole('group', { name }));

describe('GenresTab', () => {
  it('genresTab_render_shows21ChipsAnd4DeckRows', () => {
    render(<Harness initial={allGenresOn()} />);
    expect(top().getAllByRole('button', { pressed: true })).toHaveLength(21);
    for (const name of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
      expect(row(name).getAllByRole('button', { pressed: true })).toHaveLength(21);
    }
    expect(screen.queryByRole('group', { name: 'Goal' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('genresTab_topChipOff_callsOnChangeWithoutItInAllDecks', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(top().getByRole('button', { name: 'Roguelike' }));
    const next = firstChange(onChange);
    for (const deck of GENRE_DECKS) expect(next[deck]).not.toContain('roguelike');
    expect(top().getByRole('button', { name: 'Roguelike', pressed: false })).toBeTruthy();
    expect(row('Mechanic').queryByRole('button', { name: 'Roguelike' })).toBeNull();
  });

  it('genresTab_topChipOn_addsToEveryDeckRow', () => {
    const initial = { ...allGenresOn(), mechanic: ['puzzle' as const] };
    initial.resource = ['puzzle'];
    initial.progression = ['puzzle'];
    initial.constraint = ['puzzle'];
    const onChange = vi.fn();
    render(<Harness initial={initial} onChange={onChange} />);
    fireEvent.click(top().getByRole('button', { name: 'Horror' }));
    const next = firstChange(onChange);
    for (const deck of GENRE_DECKS) expect(next[deck]).toEqual(['puzzle', 'horror']);
    expect(row('Constraint').getByRole('button', { name: 'Horror', pressed: true })).toBeTruthy();
  });

  it('genresTab_deckChipOff_changesOnlyThatDeck', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(row('Resource').getByRole('button', { name: 'Puzzle' }));
    const next = firstChange(onChange);
    expect(next.resource).not.toContain('puzzle');
    expect(next.mechanic).toContain('puzzle');
    expect(row('Resource').getByRole('button', { name: 'Puzzle', pressed: false })).toBeTruthy();
    expect(top().getByRole('button', { name: 'Puzzle', pressed: true })).toBeTruthy();
  });

  it('genresTab_lastDeckGenre_isDisabled', () => {
    const initial = { ...allGenresOn(), mechanic: ['rpg' as const] };
    const onChange = vi.fn();
    render(<Harness initial={initial} onChange={onChange} />);
    const chip = row('Mechanic').getByRole<HTMLButtonElement>('button', { name: 'RPG' });
    expect(chip.disabled).toBe(true);
    expect(chip.title).toBe('Each deck keeps at least 1 genre.');
    const topChip = top().getByRole<HTMLButtonElement>('button', { name: 'RPG' });
    expect(topChip.disabled).toBe(true);
    fireEvent.click(chip);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('genresTab_allOn_resetsToAll21', () => {
    const initial = { ...allGenresOn(), mechanic: ['rpg' as const] };
    const onChange = vi.fn();
    render(<Harness initial={initial} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'All On' }));
    expect(firstChange(onChange)).toEqual(allGenresOn());
    expect(row('Mechanic').getAllByRole('button', { pressed: true })).toHaveLength(21);
  });

  it('genresTab_allOnWhenAllOn_noChange', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'All On' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('genresTab_deckOffEverywhere_topChipStaysWhileOpen', () => {
    render(<Harness initial={allGenresOn()} />);
    for (const name of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
      fireEvent.click(row(name).getByRole('button', { name: 'Shooter' }));
    }
    expect(top().getByRole('button', { name: 'Shooter', pressed: true })).toBeTruthy();
    expect(row('Mechanic').getByRole('button', { name: 'Shooter', pressed: false })).toBeTruthy();
  });
});
