/**
 * Tests for the ring math: turns, the edge pair formula, combine, swap and split.
 */
import { describe, expect, it } from 'vitest';
import type { Card, CardType } from '@/shared/model';
import { activeText, combine, edgeCues, split, swap, turnCard, turnRing } from './rings';

function card(type: CardType, rings: { texts: string[]; activeIndex?: number }[]): Card {
  return {
    id: `${type}-1`,
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
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
    const right = edgeCues(card('character', [{ texts: NOUNS }]))[3]!.noun.text;
    const turned = turnRing(ring4, 'cw');
    expect(ring4.cues[turned.activeIndex]!.text).toBe(right);
  });

  it('turnRing_fourCuesCcw_bringsLeftCueToBottom', () => {
    const left = edgeCues(card('character', [{ texts: NOUNS }]))[1]!.noun.text;
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
        const c = card('character', [
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
      card('motivation', [{ texts: ['find home', 'repay a debt'], activeIndex: 1 }]),
    );
    expect(edges.map((e) => e.noun.text)).toEqual(['repay a debt', 'find home']);
  });
});

describe('turnCard', () => {
  it('turnCard_combinedInner_turnsOnlyAdjectives', () => {
    const c = card('character', [{ texts: NOUNS }, { texts: ADJS }]);
    const turned = turnCard(c, 'inner', 'cw');
    expect(turned.rings[0]!.activeIndex).toBe(0);
    expect(turned.rings[1]!.activeIndex).toBe(3);
  });

  it('turnCard_oneRingInner_turnsTheOnlyRing', () => {
    const turned = turnCard(card('character', [{ texts: NOUNS }]), 'inner', 'ccw');
    expect(turned.rings[0]!.activeIndex).toBe(1);
  });
});

describe('combine', () => {
  it('combine_characterAndDescription_addsInnerRingKeepingActiveIndex', () => {
    const target = card('character', [{ texts: NOUNS }]);
    const description = card('description', [{ texts: ADJS, activeIndex: 2 }]);
    const combined = combine(target, description);
    expect(combined.rings).toHaveLength(2);
    expect(combined.rings[1]).toEqual(description.rings[0]);
    expect(combined.id).toBe(target.id);
  });

  it('combine_settingAndDescription_addsInnerRing', () => {
    const combined = combine(
      card('setting', [{ texts: NOUNS }]),
      card('description', [{ texts: ADJS }]),
    );
    expect(combined.rings).toHaveLength(2);
  });

  it('combine_alreadyCombined_throws', () => {
    const target = card('character', [{ texts: NOUNS }, { texts: ADJS }]);
    expect(() => combine(target, card('description', [{ texts: ADJS }]))).toThrow();
  });

  it('combine_motivationTarget_throws', () => {
    const target = card('motivation', [{ texts: ['a', 'b'] }]);
    expect(() => combine(target, card('description', [{ texts: ADJS }]))).toThrow();
  });

  it('combine_any_doesNotMutateInputs', () => {
    const target = card('character', [{ texts: NOUNS }]);
    const description = card('description', [{ texts: ADJS }]);
    const before = structuredClone([target, description]);
    const combined = combine(target, description);
    combined.rings[1]!.cues.push({ text: 'extra' });
    expect([target, description]).toEqual(before);
  });
});

describe('activeText', () => {
  it('activeText_combined_returnsAdjectiveSpaceNoun', () => {
    const c = card('character', [{ texts: NOUNS }, { texts: ADJS }]);
    expect(activeText(c)).toBe('exiled navigator');
    expect(activeText(card('character', [{ texts: NOUNS }]))).toBe('navigator');
  });
});

describe('swap', () => {
  const DEVOUT = ['devout', 'rogue', 'cloned', 'hollow'];

  it('swap_combinedAndDescription_exchangesRingsWithActiveCues', () => {
    const target = card('character', [{ texts: NOUNS }, { texts: ADJS, activeIndex: 2 }]);
    const description = card('description', [{ texts: DEVOUT, activeIndex: 1 }]);
    const result = swap(target, description);
    expect(result.target.rings[0]).toEqual(target.rings[0]);
    expect(result.target.rings[1]).toEqual(description.rings[0]);
    expect(result.description.rings).toEqual([target.rings[1]]);
    expect(activeText(result.target)).toBe('rogue navigator');
    expect(result.target.rings[1]!.cues).not.toBe(description.rings[0]!.cues);
  });

  it('swap_uncombinedTarget_throws', () => {
    const description = card('description', [{ texts: DEVOUT }]);
    expect(() => swap(card('character', [{ texts: NOUNS }]), description)).toThrow();
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
    expect(() => split(card('character', [{ texts: NOUNS }]))).toThrow();
  });
});
