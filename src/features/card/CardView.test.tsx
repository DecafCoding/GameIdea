/**
 * Tests for CardView: edges, the 2-cue layout, combined pairs, the combined disc edge,
 * the kind icon on the disc, and the draw → combine → turn checkpoint.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { drawCard } from '@/features/draw';
import { GENRES, type Card, type CardType, type Pool } from '@/shared/model';
import { CardView } from './CardView';
import { combine, turnCard } from './rings';

function card(type: CardType, rings: string[][], kinds = false): Card {
  return {
    id: `${type}-1`,
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    rings: rings.map((texts) => ({
      cues: texts.map((text) => (kinds ? { text, kind: 'place' as const } : { text })),
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
  it('CardView_characterCard_rendersFourEdgesWithFirstCueActive', () => {
    const { container } = render(<CardView card={card('character', [NOUNS])} onTurn={noop} />);
    expect(edges(container)).toHaveLength(4);
    expect(screen.getByTestId('active-cue').textContent).toBe('navigator');
  });

  it('CardView_motivationCard_rendersTwoCuesAndMiddleRule', () => {
    const { container } = render(
      <CardView card={card('motivation', [['find home', 'repay a debt']])} onTurn={noop} />,
    );
    expect(edges(container)).toHaveLength(2);
    expect(screen.getByTestId('middle-rule')).toBeTruthy();
  });

  it('CardView_combinedCard_activeCueReadsAdjectiveSpaceNoun', () => {
    render(<CardView card={card('character', [NOUNS, ADJS])} onTurn={noop} />);
    expect(screen.getByTestId('active-cue').textContent).toBe('exiled navigator');
  });

  it('CardView_combinedCard_showsPurpleDiscEdge', () => {
    render(<CardView card={card('character', [NOUNS, ADJS])} onTurn={noop} />);
    expect(screen.getByTestId('combined-disc')).toBeTruthy();
  });

  it('CardView_oneRingCard_hasNoPurpleDiscEdge', () => {
    render(<CardView card={card('character', [NOUNS])} onTurn={noop} />);
    expect(screen.queryByTestId('combined-disc')).toBeNull();
  });

  it('CardView_settingCard_discShowsBottomCueKindAndEdgesHaveNoIcon', () => {
    const setting = card('setting', [NOUNS], true);
    const kinds = ['place', 'object', 'event', 'place'] as const;
    setting.rings[0]!.cues.forEach((cue, i) => (cue.kind = kinds[i]));
    setting.rings[0]!.activeIndex = 1;
    const { container } = render(<CardView card={setting} onTurn={noop} />);
    const disc = screen.getByTestId('type-disc');
    expect(disc.querySelector('[data-icon="cube"]')).toBeTruthy();
    for (const edge of edges(container)) expect(edge.querySelector('[data-icon]')).toBeNull();
  });

  it('CardView_characterCard_discShowsTypeIcon', () => {
    render(<CardView card={card('character', [NOUNS])} onTurn={noop} />);
    expect(screen.getByTestId('type-disc').querySelector('[data-icon="person"]')).toBeTruthy();
  });

  it('CardView_card_hasTitleCaseAriaLabel', () => {
    render(<CardView card={card('description', [ADJS])} onTurn={noop} />);
    expect(screen.getByRole('article', { name: 'Description Card' })).toBeTruthy();
  });

  it('CardView_combinedInnerRightClick_changesOnlyBottomAdjective', () => {
    const pool = (type: CardType, texts: string[]): Pool => ({
      type,
      cues: texts.map((text, i) => ({ id: `${type}-${i}`, text, genres: ['generic'] })),
    });
    const character = drawCard('character', pool('character', NOUNS), GENRES);
    const description = drawCard('description', pool('description', ADJS), GENRES);
    const combined = combine(character, description);
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
    const { rerender } = render(<CardView card={card('motivation', [['a', 'b']])} onTurn={noop} />);
    const top = screen.getByTestId('card').className;
    rerender(<CardView card={card('motivation', [['a', 'b']])} onTurn={noop} paper="under-1" />);
    const tucked = screen.getByTestId('card');
    expect(tucked.dataset.paper).toBe('under-1');
    expect(tucked.className).not.toBe(top);
  });

  it('cardView_tucked_showsTypeMarkOnlyWhenTucked', () => {
    const { rerender } = render(<CardView card={card('character', [NOUNS])} onTurn={noop} />);
    expect(screen.queryByTestId('tuck-mark')).toBeNull();
    rerender(<CardView card={card('character', [NOUNS])} onTurn={noop} paper="under-2" />);
    const icon = screen.getByTestId('tuck-mark').querySelector('[data-icon]');
    expect(icon?.getAttribute('data-icon')).toBe('person');
  });

  it('cardView_ringClassName_onEveryRingHalf', () => {
    render(<CardView card={card('character', [NOUNS])} onTurn={noop} ringClassName="nodrag" />);
    const halves = screen.getAllByRole('button', { name: /^Turn / });
    expect(halves.every((half) => half.classList.contains('nodrag'))).toBe(true);
  });
});
