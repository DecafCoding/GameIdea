/**
 * Tests for the grouped rail: group order, the Modifiers row and the pools-off state.
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
      onOpenGenres={noop}
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
    ).toEqual(['Core', 'Modifiers', 'Optional', 'Genres']);
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
    ]);
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

  it('sideRail_genreDecks_showPillsOnlyWhenNarrowed', () => {
    const { rerender } = renderRail();
    expect(screen.queryByRole('img', { name: /genres? on$/ })).toBeNull();
    const genres = {
      ...allGenresOn(),
      mechanic: ['puzzle' as const, 'rpg' as const, 'horror' as const],
    };
    rerender(
      <SideRail
        decksReady
        onDraw={noop}
        onDrawHook={noop}
        onAddNote={noop}
        genres={genres}
        onOpenGenres={noop}
      />,
    );
    const pill = screen.getByRole('img', { name: '3 genres on' });
    expect(pill.textContent).toBe('3');
    const mechanic = screen.getByRole('button', { name: 'Draw A Mechanic' });
    expect(mechanic.contains(pill)).toBe(true);
    expect(mechanic.getAttribute('aria-describedby')).toBe(pill.id);
    expect(
      screen.getByRole('button', { name: 'Draw A Resource' }).hasAttribute('aria-describedby'),
    ).toBe(false);
    // The line counts the union of the 4 decks; the other 3 still have all 21.
    expect(screen.getByRole('button', { name: 'Genres' }).textContent).toContain('All genres');
  });

  it('sideRail_genresButton_opensPanelCallback', () => {
    const onOpenGenres = vi.fn();
    renderRail({ onOpenGenres });
    fireEvent.click(screen.getByRole('button', { name: 'Genres' }));
    expect(onOpenGenres).toHaveBeenCalledTimes(1);
  });
});
