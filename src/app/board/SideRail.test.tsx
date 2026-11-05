/**
 * Tests for the grouped rail: group order (no Genres group), the Modifiers row, the
 * pools-off state, the count pills and the pressed Settings button.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { allGenresOn } from '@/shared/model';
import { SideRail } from './SideRail';

const noop = () => {};

function renderRail(props: Partial<Parameters<typeof SideRail>[0]> = {}) {
  return render(
    <SideRail
      decksReady
      onDraw={noop}
      onDrawHook={noop}
      onAddNote={noop}
      genres={allGenresOn()}
      onOpenSettings={noop}
      onEditGenres={noop}
      settingsOpen={false}
      {...props}
    />,
  );
}

describe('SideRail', () => {
  it('sideRail_groups_inDesignOrder', () => {
    renderRail();
    const rail = screen.getByRole('complementary', { name: 'Decks' });
    expect(
      within(rail)
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(['Core', 'Modifiers', 'Optional']);
    expect(within(rail).queryByRole('button', { name: 'Genres' })).toBeNull();
    expect(
      within(rail)
        .getAllByRole('button', { name: /^Draw A / })
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Draw A Hook Card',
      'Draw A Player Role',
      'Draw A Mechanic',
      'Draw A Resource',
      'Draw A Goal',
      'Draw A Conflict',
      'Draw A Player Role Modifier',
      'Draw A Resource Modifier',
      'Draw A Setting Modifier',
      'Draw A Setting',
      'Draw A Mood',
      'Draw A Twist',
      'Draw A Progression',
      'Draw A Constraint',
    ]);
  });

  it('sideRail_optionalButtons_drawTheirDeck', () => {
    const onDraw = vi.fn();
    renderRail({ onDraw });
    for (const [name, type] of [
      ['Mood', 'mood'],
      ['Twist', 'twist'],
      ['Progression', 'progression'],
      ['Constraint', 'constraint'],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: `Draw A ${name}` }));
      expect(onDraw).toHaveBeenLastCalledWith(type, expect.anything(), undefined);
    }
    expect(onDraw).toHaveBeenCalledTimes(4);
  });

  it('sideRail_progressionAndConstraint_showCountsWhenNarrowed', () => {
    renderRail({
      genres: {
        ...allGenresOn(),
        progression: ['puzzle', 'rpg'],
        constraint: ['horror'],
      },
    });
    expect(
      screen.getByRole('button', { name: 'Edit Progression Genres, 2 genres on' }).textContent,
    ).toBe('2');
    expect(
      screen.getByRole('button', { name: 'Edit Constraint Genres, 1 genre on' }).textContent,
    ).toBe('1');
    expect(screen.queryByRole('button', { name: /^Edit (Mood|Twist) Genres/ })).toBeNull();
  });

  it('sideRail_modifierButtons_drawWithModDeck', () => {
    const onDraw = vi.fn();
    renderRail({ onDraw });
    const resource = screen.getByRole('button', { name: 'Draw A Resource Modifier' });
    expect(resource.getAttribute('title')).toBe('Resource Modifier');
    expect(resource.textContent).toBe('');
    fireEvent.click(resource);
    expect(onDraw).toHaveBeenCalledWith('modifier', expect.anything(), 'resource');
    fireEvent.click(screen.getByRole('button', { name: 'Draw A Mechanic' }));
    expect(onDraw).toHaveBeenLastCalledWith('mechanic', expect.anything(), undefined);
  });

  it('sideRail_hookDisabled_hookButtonDisabled', () => {
    const onDrawHook = vi.fn();
    renderRail({ hookDisabled: true, onDrawHook });
    const hook = screen.getByRole<HTMLButtonElement>('button', { name: 'Draw A Hook Card' });
    expect(hook.disabled).toBe(true);
    fireEvent.click(hook);
    expect(onDrawHook).not.toHaveBeenCalled();
  });

  it('sideRail_poolsNotReady_disablesDecksButNotHookCard', () => {
    const onDrawHook = vi.fn();
    renderRail({ decksReady: false, onDrawHook });
    for (const button of screen.getAllByRole('button', { name: /^Draw A / })) {
      const hook = button.getAttribute('aria-label') === 'Draw A Hook Card';
      expect((button as HTMLButtonElement).disabled).toBe(!hook);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Draw A Hook Card' }));
    expect(onDrawHook).toHaveBeenCalledOnce();
  });

  it('sideRail_genreDecks_dramaIconAtAll21CountWhenNarrowed', () => {
    renderRail({
      genres: { ...allGenresOn(), mechanic: ['puzzle', 'rpg', 'horror'] },
    });
    const buttons = screen.getAllByRole('button', { name: /^Edit .* Genres/ });
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Edit Mechanic Genres, 3 genres on',
      'Edit Resource Genres, all genres on',
      'Edit Progression Genres, all genres on',
      'Edit Constraint Genres, all genres on',
    ]);
    expect(buttons[0]!.textContent).toBe('3');
    expect(buttons[1]!.querySelector('[data-icon="drama"]')).not.toBeNull();
    for (const b of buttons) expect(b.getAttribute('title')).toBe('Edit Genres');
    const mechanic = screen.getByRole('button', { name: 'Draw A Mechanic' });
    expect(mechanic.nextElementSibling).toBe(buttons[0]);
  });

  it('sideRail_editGenres_callsOnEditGenres', () => {
    const onEditGenres = vi.fn();
    const onOpenSettings = vi.fn();
    renderRail({ onEditGenres, onOpenSettings });
    fireEvent.click(screen.getByRole('button', { name: /^Edit Resource Genres/ }));
    expect(onEditGenres).toHaveBeenCalledOnce();
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it('sideRail_settingsOpen_buttonAriaExpandedTrue', () => {
    const { rerender } = renderRail();
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.getAttribute('aria-haspopup')).toBe('dialog');
    expect(settings.getAttribute('aria-expanded')).toBe('false');
    rerender(
      <SideRail
        decksReady
        onDraw={noop}
        onDrawHook={noop}
        onAddNote={noop}
        genres={allGenresOn()}
        onOpenSettings={noop}
        onEditGenres={noop}
        settingsOpen
      />,
    );
    expect(screen.getByRole('button', { name: 'Settings' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('sideRail_settings_lastAndCallsOnOpenSettings', () => {
    const onOpenSettings = vi.fn();
    renderRail({ onOpenSettings });
    const rail = screen.getByRole('complementary', { name: 'Decks' });
    const buttons = within(rail).getAllByRole('button');
    expect(buttons.at(-2)?.textContent).toBe('Add Note');
    expect(buttons.at(-1)?.textContent).toBe('Settings');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('sideRail_helpPanel_gone', () => {
    renderRail();
    expect(screen.queryByText('Click a deck to draw one card.')).toBeNull();
    expect(screen.queryByText(/Drag a card under another/)).toBeNull();
  });
});
