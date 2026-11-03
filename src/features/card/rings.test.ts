/**
 * Tests for the ring math: turns, the edge pair formula, combine, swap and split.
 */
import { describe, expect, it } from 'vitest';
import type { Card, CardType, ModDeck } from '@/shared/model';
import { activeText, combine, edgeCues, ringWord, split, swap, turnCard, turnRing } from './rings';

function card(type: CardType, rings: { texts: string[]; activeIndex?: number }[]): Card {
  return {
    id: `${type}-1`,
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    onTopOf: null,
    locked: false,
    rings: rings.map(({ texts, activeIndex = 0 }) => ({
      cues: texts.map((text) => ({ text })),
      activeIndex,
    })),
  };
}

const NOUNS = ['navigator', 'diplomat', 'gardener', 'captain'];
const ADJS = ['exiled', 'orbital', 'clone', 'salvage'];
const ring4 = { cues: NOUNS.map((text) => ({ text })), activeIndex: 0 };

describe('turnRing', () => {
  it('turnRing_fourCuesCw_bringsRightCueToBottom', () => {
    const right = edgeCues(card('role', [{ texts: NOUNS }]))[3]!.noun.text;
    const turned = turnRing(ring4, 'cw');
    expect(ring4.cues[turned.activeIndex]!.text).toBe(right);
  });

  it('turnRing_fourCuesCcw_bringsLeftCueToBottom', () => {
    const left = edgeCues(card('role', [{ texts: NOUNS }]))[1]!.noun.text;
    const turned = turnRing(ring4, 'ccw');
    expect(ring4.cues[turned.activeIndex]!.text).toBe(left);
  });

  it('turnRing_fourTurnsSameWay_returnsToStart', () => {
    for (const direction of ['cw', 'ccw'] as const) {
      let ring = ring4;
      for (let i = 0; i < 4; i++) ring = turnRing(ring, direction);
      expect(ring.activeIndex).toBe(0);
    }
  });

  it('turnRing_twoCues_eitherDirectionSwaps', () => {
    const ring = { cues: [{ text: 'a' }, { text: 'b' }], activeIndex: 0 };
    expect(turnRing(ring, 'cw').activeIndex).toBe(1);
    expect(turnRing(ring, 'ccw').activeIndex).toBe(1);
  });
});

describe('edgeCues', () => {
  it('edgeCues_allActivePairs_matchFormula', () => {
    for (let a0 = 0; a0 < 4; a0++) {
      for (let a1 = 0; a1 < 4; a1++) {
        const c = card('role', [
          { texts: NOUNS, activeIndex: a0 },
          { texts: ADJS, activeIndex: a1 },
        ]);
        const edges = edgeCues(c);
        for (let k = 0; k < 4; k++) {
          expect(edges[k]!.edge).toBe(k);
          expect(edges[k]!.noun.text).toBe(NOUNS[(a0 + k) % 4]);
          expect(edges[k]!.adjective!.text).toBe(ADJS[(a1 + k) % 4]);
        }
      }
    }
  });

  it('edgeCues_twoCueCard_bottomThenTop', () => {
    const edges = edgeCues(
      card('goal', [{ texts: ['find home', 'repay a debt'], activeIndex: 1 }]),
    );
    expect(edges.map((e) => e.noun.text)).toEqual(['repay a debt', 'find home']);
  });
});

describe('turnCard', () => {
  it('turnCard_combinedInner_turnsOnlyAdjectives', () => {
    const c = card('role', [{ texts: NOUNS }, { texts: ADJS }]);
    const turned = turnCard(c, 'inner', 'cw');
    expect(turned.rings[0]!.activeIndex).toBe(0);
    expect(turned.rings[1]!.activeIndex).toBe(3);
  });

  it('turnCard_oneRingInner_turnsTheOnlyRing', () => {
    const turned = turnCard(card('role', [{ texts: NOUNS }]), 'inner', 'ccw');
    expect(turned.rings[0]!.activeIndex).toBe(1);
  });
});

describe('combine', () => {
  it('combine_roleAndModifier_addsInnerRingKeepingActiveIndex', () => {
    const target = card('role', [{ texts: NOUNS }]);
    const modifier = card('modifier', [{ texts: ADJS, activeIndex: 2 }]);
    const combined = combine(target, modifier);
    expect(combined.rings).toHaveLength(2);
    // A Modifier without a modDeck falls back to the Player Role Modifier deck.
    expect(combined.rings[1]).toEqual({ ...modifier.rings[0], modDeck: 'role' });
    expect(combined.id).toBe(target.id);
  });

  it('combine_settingAndModifier_addsInnerRing', () => {
    const combined = combine(
      card('setting', [{ texts: NOUNS }]),
      card('modifier', [{ texts: ADJS }]),
    );
    expect(combined.rings).toHaveLength(2);
  });

  it('combine_alreadyCombined_throws', () => {
    const target = card('role', [{ texts: NOUNS }, { texts: ADJS }]);
    expect(() => combine(target, card('modifier', [{ texts: ADJS }]))).toThrow();
  });

  it('combine_goalTarget_throws', () => {
    const target = card('goal', [{ texts: ['a', 'b'] }]);
    expect(() => combine(target, card('modifier', [{ texts: ADJS }]))).toThrow();
  });

  it('combine_any_doesNotMutateInputs', () => {
    const target = card('role', [{ texts: NOUNS }]);
    const modifier = card('modifier', [{ texts: ADJS }]);
    const before = structuredClone([target, modifier]);
    const combined = combine(target, modifier);
    combined.rings[1]!.cues.push({ text: 'extra' });
    expect([target, modifier]).toEqual(before);
  });
});

describe('activeText', () => {
  it('activeText_combined_returnsAdjectiveSpaceNoun', () => {
    const c = card('role', [{ texts: NOUNS }, { texts: ADJS }]);
    expect(activeText(c)).toBe('exiled navigator');
    expect(activeText(card('role', [{ texts: NOUNS }]))).toBe('navigator');
  });
});

describe('swap', () => {
  const DEVOUT = ['devout', 'rogue', 'cloned', 'hollow'];

  it('swap_combinedAndModifier_exchangesRingsWithActiveCues', () => {
    const target = card('role', [{ texts: NOUNS }, { texts: ADJS, activeIndex: 2 }]);
    const modifier = card('modifier', [{ texts: DEVOUT, activeIndex: 1 }]);
    const result = swap(target, modifier);
    expect(result.target.rings[0]).toEqual(target.rings[0]);
    expect(result.target.rings[1]).toEqual({ ...modifier.rings[0], modDeck: 'role' });
    expect(result.modifier.rings).toEqual([target.rings[1]]);
    expect(result.modifier.modDeck).toBe('role');
    expect(activeText(result.target)).toBe('rogue navigator');
    expect(result.target.rings[1]!.cues).not.toBe(modifier.rings[0]!.cues);
  });

  it('swap_uncombinedTarget_throws', () => {
    const modifier = card('modifier', [{ texts: DEVOUT }]);
    expect(() => swap(card('role', [{ texts: NOUNS }]), modifier)).toThrow();
  });
});

describe('split', () => {
  it('split_combined_returnsNounsOnlyAndAdjectiveRing', () => {
    const target = card('setting', [{ texts: NOUNS }, { texts: ADJS, activeIndex: 3 }]);
    const result = split(target);
    expect(result.target.rings).toEqual([target.rings[0]]);
    expect(result.ring).toEqual({ cues: ADJS.map((text) => ({ text })), activeIndex: 3 });
    expect(result.ring.cues).not.toBe(target.rings[1]!.cues);
  });

  it('split_uncombined_throws', () => {
    expect(() => split(card('role', [{ texts: NOUNS }]))).toThrow();
  });
});

describe('ringWord', () => {
  const ringCard = (type: CardType, rings = 1): Card =>
    card(
      type,
      Array.from({ length: rings }, () => ({ texts: ['a', 'b', 'c', 'd'] })),
    );

  it.each([
    ['role', 0, 'Nouns'],
    ['resource', 0, 'Nouns'],
    ['setting', 0, 'Nouns'],
    ['role', 1, 'Adjectives'],
    ['resource', 1, 'Adjectives'],
    ['modifier', 0, 'Adjectives'],
    ['mechanic', 0, 'Cues'],
    ['mood', 0, 'Cues'],
    ['goal', 0, 'Cues'],
    ['conflict', 0, 'Cues'],
    ['twist', 0, 'Cues'],
    ['progression', 0, 'Cues'],
    ['constraint', 0, 'Cues'],
  ] as const)('ringWord_eachDeck_namesItsCues (%s ring %i)', (type, ring, word) => {
    expect(ringWord(ringCard(type, ring + 1), ring)).toBe(word);
  });
});

describe('modDeck', () => {
  const withDeck = (c: Card, modDeck: ModDeck): Card => ({ ...c, modDeck });

  it('combine_resource_merges', () => {
    const combined = combine(
      card('resource', [{ texts: NOUNS }]),
      withDeck(card('modifier', [{ texts: ADJS }]), 'resource'),
    );
    expect(combined.rings).toHaveLength(2);
    expect(activeText(combined)).toBe(`${ADJS[0]} ${NOUNS[0]}`);
  });

  it('combine_mechanic_throws', () => {
    expect(() =>
      combine(card('mechanic', [{ texts: NOUNS }]), card('modifier', [{ texts: ADJS }])),
    ).toThrow(/Player Role, Resource or Setting/);
  });

  it('combine_copiesModDeckToRing', () => {
    const combined = combine(
      card('role', [{ texts: NOUNS }]),
      withDeck(card('modifier', [{ texts: ADJS }]), 'setting'),
    );
    expect(combined.rings[0]!.modDeck).toBeUndefined();
    expect(combined.rings[1]!.modDeck).toBe('setting');
  });

  it('swap_exchangesModDecks', () => {
    const base = combine(
      card('role', [{ texts: NOUNS }]),
      withDeck(card('modifier', [{ texts: ADJS }]), 'setting'),
    );
    const incoming = withDeck(
      card('modifier', [{ texts: ['devout', 'rogue', 'cloned', 'hollow'] }]),
      'resource',
    );
    const result = swap(base, incoming);
    expect(result.target.rings[1]!.modDeck).toBe('resource');
    expect(result.modifier.modDeck).toBe('setting');
    expect(result.modifier.rings[0]!.modDeck).toBeUndefined();
  });

  it('split_returnsRingWithModDeck', () => {
    const base = combine(
      card('setting', [{ texts: NOUNS }]),
      withDeck(card('modifier', [{ texts: ADJS }]), 'resource'),
    );
    expect(split(base).ring.modDeck).toBe('resource');
  });
});
