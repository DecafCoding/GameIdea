/**
 * Tests for CardView: edges, the 2-cue layout, combined pairs, the combined disc edge,
 * the kind icon on the disc, and the draw → combine → turn checkpoint.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { drawCard } from '@/features/draw';
import type { Card, CardType, Deck, Pool } from '@/shared/model';
import { CardView } from './CardView';
import { combine, turnCard } from './rings';

function card(type: CardType, rings: string[][]): Card {
  return {
    id: `${type}-1`,
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    onTopOf: null,
    locked: false,
    inConcept: false,
    rings: rings.map((texts) => ({
      cues: texts.map((text) => ({ text })),
      activeIndex: 0,
    })),
  };
}

const NOUNS = ['navigator', 'diplomat', 'gardener', 'captain'];
const ADJS = ['exiled', 'orbital', 'clone', 'salvage'];
const noop = () => {};

const edges = (container: HTMLElement) => container.querySelectorAll('[data-edge]');

/** A stateful harness that applies turnCard, as the page does. */
function Harness({ initial }: { initial: Card }) {
  const [c, setC] = useState(initial);
  return <CardView card={c} onTurn={(slot, dir) => setC((prev) => turnCard(prev, slot, dir))} />;
}

describe('CardView', () => {
  it('CardView_roleCard_rendersFourEdgesWithFirstCueActive', () => {
    const { container } = render(<CardView card={card('role', [NOUNS])} onTurn={noop} />);
    expect(edges(container)).toHaveLength(4);
    expect(screen.getByTestId('active-cue').textContent).toBe('navigator');
  });

  it('CardView_goalCard_rendersTwoCuesAndMiddleRule', () => {
    const { container } = render(
      <CardView card={card('goal', [['find home', 'repay a debt']])} onTurn={noop} />,
    );
    expect(edges(container)).toHaveLength(2);
    expect(screen.getByTestId('middle-rule')).toBeTruthy();
  });

  it('CardView_combinedCard_activeCueReadsAdjectiveSpaceNoun', () => {
    render(<CardView card={card('role', [NOUNS, ADJS])} onTurn={noop} />);
    expect(screen.getByTestId('active-cue').textContent).toBe('exiled navigator');
  });

  it('CardView_combinedCard_showsPurpleDiscEdge', () => {
    render(<CardView card={card('role', [NOUNS, ADJS])} onTurn={noop} />);
    expect(screen.getByTestId('combined-disc')).toBeTruthy();
  });

  it('CardView_oneRingCard_hasNoPurpleDiscEdge', () => {
    render(<CardView card={card('role', [NOUNS])} onTurn={noop} />);
    expect(screen.queryByTestId('combined-disc')).toBeNull();
  });

  it('CardView_settingCard_discShowsTypeIconAndEdgesHaveNoIcon', () => {
    const setting = card('setting', [NOUNS]);
    setting.rings[0]!.activeIndex = 1;
    const { container } = render(<CardView card={setting} onTurn={noop} />);
    const disc = screen.getByTestId('type-disc');
    expect(disc.querySelector('[data-icon="map-pin"]')).toBeTruthy();
    for (const edge of edges(container)) expect(edge.querySelector('[data-icon]')).toBeNull();
  });

  it('CardView_roleCard_discShowsTypeIcon', () => {
    render(<CardView card={card('role', [NOUNS])} onTurn={noop} />);
    expect(screen.getByTestId('type-disc').querySelector('[data-icon="user"]')).toBeTruthy();
  });

  it('CardView_card_hasTitleCaseAriaLabel', () => {
    render(<CardView card={{ ...card('modifier', [ADJS]), modDeck: 'resource' }} onTurn={noop} />);
    expect(screen.getByRole('article', { name: 'Resource Modifier Card' })).toBeTruthy();
  });

  it('CardView_combinedInnerRightClick_changesOnlyBottomAdjective', () => {
    const pool = (type: Deck, texts: string[]): Pool => ({
      type,
      cues: texts.map((text, i) => ({ id: `${type}-${i}`, text, targets: ['role'] })),
    });
    const role = drawCard('role', pool('role', NOUNS));
    const modifier = drawCard('modifier', pool('modifier', ADJS), { modDeck: 'role' });
    const combined = combine(role, modifier);
    const [noun, adjective] = [combined.rings[0]!.cues[0]!.text, combined.rings[1]!.cues[0]!.text];

    render(<Harness initial={combined} />);
    expect(screen.getByTestId('active-cue').textContent).toBe(`${adjective} ${noun}`);

    fireEvent.click(screen.getByRole('button', { name: 'Turn Adjectives Right' }));
    // Clockwise brings the right-edge adjective (edge 3) to the bottom; the noun stays.
    const expected = combined.rings[1]!.cues[3]!.text;
    expect(screen.getByTestId('active-cue').textContent).toBe(`${expected} ${noun}`);
    expect(expected).not.toBe(adjective);
  });

  it('cardView_paperUnder1_usesUnderPaper', () => {
    const { rerender } = render(<CardView card={card('goal', [['a', 'b']])} onTurn={noop} />);
    const top = screen.getByTestId('card').className;
    rerender(<CardView card={card('goal', [['a', 'b']])} onTurn={noop} paper="under-1" />);
    const tucked = screen.getByTestId('card');
    expect(tucked.dataset.paper).toBe('under-1');
    expect(tucked.className).not.toBe(top);
  });

  it('cardView_tucked_showsTypeMarkOnlyWhenTucked', () => {
    const { rerender } = render(<CardView card={card('role', [NOUNS])} onTurn={noop} />);
    expect(screen.queryByTestId('tuck-mark')).toBeNull();
    rerender(<CardView card={card('role', [NOUNS])} onTurn={noop} paper="under-2" />);
    const icon = screen.getByTestId('tuck-mark').querySelector('[data-icon]');
    expect(icon?.getAttribute('data-icon')).toBe('user');
  });

  it('cardView_ringClassName_onEveryRingHalf', () => {
    render(<CardView card={card('role', [NOUNS])} onTurn={noop} ringClassName="nodrag" />);
    const halves = screen.getAllByRole('button', { name: /^Turn / });
    expect(halves.every((half) => half.classList.contains('nodrag'))).toBe(true);
  });

  it.each([
    ['role', 'user-plus'],
    ['resource', 'battery-plus'],
    ['setting', 'map-pin-plus'],
  ] as const)('cardView_modifierEachModDeck_showsItsIcon (%s)', (modDeck, icon) => {
    render(<CardView card={{ ...card('modifier', [ADJS]), modDeck }} onTurn={noop} />);
    const article = screen.getByRole('article');
    expect(article.getAttribute('data-mod-deck')).toBe(modDeck);
    expect(screen.getByTestId('type-disc').querySelector(`[data-icon="${icon}"]`)).toBeTruthy();
  });

  it('cardView_mood_rendersFourCues', () => {
    render(<CardView card={card('mood', [['tense', 'cozy', 'eerie', 'giddy']])} onTurn={noop} />);
    expect(screen.getAllByText(/tense|cozy|eerie|giddy/)).toHaveLength(4);
    expect(screen.queryByTestId('middle-rule')).toBeNull();
    expect(screen.getByTestId('type-disc').querySelector('[data-icon="smile"]')).toBeTruthy();
  });

  it('cardView_constraint_rendersTwoCuesAndRule', () => {
    render(<CardView card={card('constraint', [['no jumping', 'only one hand']])} onTurn={noop} />);
    expect(screen.getByTestId('active-cue').textContent).toBe('no jumping');
    expect(screen.getAllByTestId('cue')).toHaveLength(1);
    expect(screen.getByTestId('middle-rule')).toBeTruthy();
    expect(screen.getByRole('article', { name: 'Constraint Card' })).toBeTruthy();
  });
});
