/**
 * Tests for the 2-step New Board dialog: open state and focus, the Sci-Fi nesting, the
 * at-least-1 rules of both steps, Back keeping choices, Create Board, Cancel and Esc.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { everyDeck, GENRES } from '@/shared/model';
import { GENRE_HINT_TEXT, GenreDialog } from './GenreDialog';

function renderDialog() {
  const onCancel = vi.fn();
  const onCreate = vi.fn();
  render(<GenreDialog open onCancel={onCancel} onCreate={onCreate} />);
  return { onCancel, onCreate };
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });
const tile = (name: string) =>
  within(screen.getByRole('group', { name: 'Genres' })).getByRole<HTMLButtonElement>('button', {
    name,
  });
const row = (deck: string) => within(screen.getByRole('group', { name: deck }));
const chip = (deck: string, name: string) =>
  row(deck).getByRole<HTMLButtonElement>('button', { name });
const pressed = (el: HTMLElement) => el.getAttribute('aria-pressed');
const nameField = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Board Name' });

describe('GenreDialog', () => {
  it('genreDialog_opens_newBoardTitleNameFocusedAllTilesOn', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'New Board' })).toBeTruthy();
    expect(document.activeElement).toBe(nameField());
    expect(nameField().value).toBe('Untitled Board');
    const tiles = within(screen.getByRole('group', { name: 'Genres' })).getAllByRole('button');
    expect(tiles.map((t) => t.textContent)).toEqual([
      'Generic',
      'Sci-Fi',
      'Cyberpunk',
      'Space Opera',
    ]);
    for (const t of tiles) expect(pressed(t)).toBe('true');
  });

  it('genreDialog_pressCyberpunk_turnsOnSciFi', () => {
    renderDialog();
    fireEvent.click(tile('Sci-Fi'));
    fireEvent.click(tile('Cyberpunk'));
    expect(pressed(tile('Sci-Fi'))).toBe('false');
    fireEvent.click(tile('Cyberpunk'));
    expect(pressed(tile('Cyberpunk'))).toBe('true');
    expect(pressed(tile('Sci-Fi'))).toBe('true');
  });

  it('genreDialog_noGenre_nextOffAndHintShows', () => {
    renderDialog();
    expect(screen.queryByText(GENRE_HINT_TEXT)).toBeNull();
    for (const name of ['Generic', 'Sci-Fi', 'Cyberpunk', 'Space Opera'])
      fireEvent.click(tile(name));
    expect(button('Next').disabled).toBe(true);
    expect(screen.getByText(GENRE_HINT_TEXT)).toBeTruthy();
  });

  it('genreDialog_next_showsDeckRowsWithStep1Chips', () => {
    renderDialog();
    fireEvent.click(tile('Generic'));
    fireEvent.click(button('Next'));
    expect(screen.getByRole('dialog', { name: 'Decks For "Untitled Board"' })).toBeTruthy();
    const decks = ['Character', 'Motivation', 'Setting', 'Conflict', 'Description'];
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(decks);
    for (const deck of decks) {
      const chips = row(deck).getAllByRole('button');
      expect(chips.map((c) => c.textContent)).toEqual(['Sci-Fi', 'Cyberpunk', 'Space Opera']);
      for (const c of chips) expect(pressed(c)).toBe('true');
    }
    expect(document.activeElement).toBe(chip('Character', 'Sci-Fi'));
  });

  it('genreDialog_lastChip_staysOnAndShakes', () => {
    renderDialog();
    fireEvent.click(button('Next'));
    for (const name of ['Generic', 'Sci-Fi', 'Cyberpunk']) fireEvent.click(chip('Character', name));
    fireEvent.click(chip('Character', 'Space Opera'));
    expect(pressed(chip('Character', 'Space Opera'))).toBe('true');
    expect(chip('Character', 'Space Opera').className).toMatch(/shake/);
  });

  it('genreDialog_back_keepsNameAndChoices', () => {
    renderDialog();
    fireEvent.change(nameField(), { target: { value: 'Drift' } });
    fireEvent.click(button('Next'));
    fireEvent.click(chip('Setting', 'Generic'));
    fireEvent.click(button('Back'));
    expect(nameField().value).toBe('Drift');
    expect(document.activeElement).toBe(nameField());
    fireEvent.click(button('Next'));
    expect(screen.getByRole('dialog', { name: 'Decks For "Drift"' })).toBeTruthy();
    expect(pressed(chip('Setting', 'Generic'))).toBe('false');
  });

  it('genreDialog_create_passesNameAndDeckGenres', () => {
    const { onCreate, onCancel } = renderDialog();
    fireEvent.change(nameField(), { target: { value: 'Salvage Run' } });
    fireEvent.click(button('Next'));
    for (const name of ['Generic', 'Sci-Fi', 'Space Opera'])
      fireEvent.click(chip('Character', name));
    fireEvent.click(button('Create Board'));
    expect(onCreate).toHaveBeenCalledWith('Salvage Run', {
      ...everyDeck(GENRES),
      character: ['cyberpunk'],
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('genreDialog_blankName_createsUntitledBoard', () => {
    const { onCreate } = renderDialog();
    fireEvent.change(nameField(), { target: { value: '   ' } });
    fireEvent.click(button('Next'));
    fireEvent.click(button('Create Board'));
    expect(onCreate).toHaveBeenCalledWith('Untitled Board', everyDeck(GENRES));
  });

  it('genreDialog_cancelOnEitherStep_callsOnCancelOnly', () => {
    const { onCreate, onCancel } = renderDialog();
    fireEvent.click(button('Cancel'));
    fireEvent.click(button('Next'));
    fireEvent.click(button('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('genreDialog_escape_callsOnCancel', () => {
    const { onCreate, onCancel } = renderDialog();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });
});
