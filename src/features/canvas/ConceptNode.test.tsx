/**
 * Tests for the Concept panel body: lanes in rail order with plural names, the count pill,
 * the empty help line, a combined chip's words, and the drag hints (lane placeholder, chip
 * outline and result tag).
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Board } from '@/shared/model';
import { combinedCard, onePagerBoard, secondModifier } from '@/test/fixtures/boards';
import { CONCEPT_EMPTY_TEXT, ConceptPanel, conceptCountText, panelLanes } from './ConceptNode';

function renderPanel(board: Board, hint: Parameters<typeof ConceptPanel>[0]['hint'] = null) {
  return render(<ConceptPanel width={232} lanes={panelLanes(board)} hint={hint} />);
}

const laneNames = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('ConceptPanel', () => {
  it('conceptPanel_lanes_railOrderWithPluralNames', () => {
    renderPanel(onePagerBoard());
    expect(laneNames()).toEqual(['Mechanics', 'Resources', 'Settings']);
    const resources = screen.getByRole('list', { name: 'Resources' });
    expect(
      within(resources)
        .getAllByTestId('chip')
        .map((chip) => chip.textContent),
    ).toEqual(['memories', 'rope']);
  });

  it('conceptPanel_countPill_singularAndPlural', () => {
    renderPanel(onePagerBoard());
    expect(screen.getByTestId('concept-count').textContent).toBe('4 Cards');
    expect(conceptCountText(1)).toBe('1 Card');
    expect(conceptCountText(0)).toBe('0 Cards');
  });

  it('conceptPanel_empty_showsHelpLine', () => {
    const board = onePagerBoard();
    renderPanel({ ...board, cards: board.cards.filter((card) => !card.inConcept) });
    expect(screen.getByTestId('concept-count').textContent).toBe('0 Cards');
    expect(screen.getByText(CONCEPT_EMPTY_TEXT)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Details' })).toBeTruthy();
  });

  it('conceptPanel_combinedChip_readsWithAdjective', () => {
    const board = onePagerBoard();
    renderPanel({
      ...board,
      cards: [
        ...board.cards,
        combinedCard('setting', { id: 'setting-m', z: 30, inConcept: true }),
        secondModifier({ id: 'top-1', onTopOf: 'setting-m' }),
      ],
    });
    const settings = screen.getByRole('list', { name: 'Settings' });
    expect(
      within(settings)
        .getAllByTestId('chip')
        .map((chip) => chip.textContent),
    ).toEqual(['outpost', 'devout exiled outpost']);
  });

  it('conceptPanel_combinedChip_modifierWordsLead', () => {
    const board = onePagerBoard();
    renderPanel({
      ...board,
      cards: [
        ...board.cards,
        combinedCard('setting', { id: 'setting-m', z: 30, inConcept: true }),
        secondModifier({ id: 'top-1', onTopOf: 'setting-m' }),
      ],
    });
    const chips = within(screen.getByRole('list', { name: 'Settings' })).getAllByTestId('chip');
    expect(chips[0]!.querySelector('[data-testid="chip-lead"]')).toBeNull();
    expect(chips[1]!.querySelector('[data-testid="chip-lead"]')?.textContent).toBe(
      'devout exiled ',
    );
  });

  it('conceptPanel_laneHint_addsLaneAndPlaceholder', () => {
    renderPanel(onePagerBoard(), { lane: 'goal', chipId: null, result: null });
    expect(laneNames()).toEqual(['Mechanics', 'Resources', 'Goals', 'Settings']);
    expect(screen.getByTestId('concept-slot').textContent).toBe('Goal goes here');
  });

  it('conceptPanel_chipHint_outlinesChipAndNamesResult', () => {
    renderPanel(onePagerBoard(), { lane: null, chipId: 'setting-c1', result: 'Exiled Outpost' });
    expect(screen.getByTestId('chip-result').textContent).toBe('Exiled Outpost');
    const chip = screen
      .getAllByTestId('concept-chip')
      .find((item) => item.getAttribute('data-card-id') === 'setting-c1')!;
    expect(within(chip).getByTestId('chip').getAttribute('data-targeted')).toBe('true');
  });
});
