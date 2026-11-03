/**
 * Tests for the Genres panel: chips, deck rows, the last-genre guard, All On and closing.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { allGenresOn, GENRE_DECKS, type DeckGenres } from '@/shared/model';
import { GENRES_HELP_TEXT, GenresPanel } from './GenresPanel';

function Harness({
  initial,
  onChange = () => undefined,
  onClose = () => undefined,
}: {
  initial: DeckGenres;
  onChange?: (genres: DeckGenres) => void;
  onClose?: () => void;
}) {
  const [genres, setGenres] = useState(initial);
  return (
    <GenresPanel
      genres={genres}
      onChange={(next) => {
        setGenres(next);
        onChange(next);
      }}
      onClose={onClose}
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

describe('GenresPanel', () => {
  it('genresPanel_open_showsTitleHelp21ChipsAnd4DeckRows', () => {
    render(<Harness initial={allGenresOn()} />);
    expect(screen.getByRole('dialog', { name: 'Genres' })).toBeTruthy();
    expect(screen.getByText(GENRES_HELP_TEXT)).toBeTruthy();
    expect(top().getAllByRole('button', { pressed: true })).toHaveLength(21);
    for (const name of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
      expect(row(name).getAllByRole('button', { pressed: true })).toHaveLength(21);
    }
    expect(screen.queryByRole('group', { name: 'Goal' })).toBeNull();
    expect(screen.getByText('Each deck keeps at least 1 genre.')).toBeTruthy();
  });

  it('genresPanel_topChipOff_callsOnChangeWithoutItInAllDecks', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(top().getByRole('button', { name: 'Roguelike' }));
    const next = firstChange(onChange);
    for (const deck of GENRE_DECKS) expect(next[deck]).not.toContain('roguelike');
    expect(top().getByRole('button', { name: 'Roguelike', pressed: false })).toBeTruthy();
    expect(row('Mechanic').queryByRole('button', { name: 'Roguelike' })).toBeNull();
  });

  it('genresPanel_topChipOn_addsToEveryDeckRow', () => {
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

  it('genresPanel_deckChipOff_changesOnlyThatDeck', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(row('Resource').getByRole('button', { name: 'Puzzle' }));
    const next = firstChange(onChange);
    expect(next.resource).not.toContain('puzzle');
    expect(next.mechanic).toContain('puzzle');
    expect(row('Resource').getByRole('button', { name: 'Puzzle', pressed: false })).toBeTruthy();
    expect(top().getByRole('button', { name: 'Puzzle', pressed: true })).toBeTruthy();
  });

  it('genresPanel_lastDeckGenre_isDisabled', () => {
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

  it('genresPanel_allOn_resetsToAll21', () => {
    const initial = { ...allGenresOn(), mechanic: ['rpg' as const] };
    const onChange = vi.fn();
    render(<Harness initial={initial} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'All On' }));
    expect(firstChange(onChange)).toEqual(allGenresOn());
    expect(row('Mechanic').getAllByRole('button', { pressed: true })).toHaveLength(21);
  });

  it('genresPanel_allOnWhenAllOn_noChange', () => {
    const onChange = vi.fn();
    render(<Harness initial={allGenresOn()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'All On' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('genresPanel_doneCloseAndEsc_callOnClose', () => {
    const onClose = vi.fn();
    render(<Harness initial={allGenresOn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('genresPanel_deckOffEverywhere_topChipStaysWhileOpen', () => {
    render(<Harness initial={allGenresOn()} />);
    for (const name of ['Mechanic', 'Resource', 'Progression', 'Constraint']) {
      fireEvent.click(row(name).getByRole('button', { name: 'Shooter' }));
    }
    expect(top().getByRole('button', { name: 'Shooter', pressed: true })).toBeTruthy();
    expect(row('Mechanic').getByRole('button', { name: 'Shooter', pressed: false })).toBeTruthy();
  });
});
