/**
 * Tests for the ring control, the R / Shift+R keys and the ring-half clip paths.
 */
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Card, CardType } from '@/shared/model';
import { RingControl } from './RingControl';
import { halfAnnulusPath } from './ringGeometry';
import { useRingKeys } from './useRingKeys';

function card(type: CardType, ringCount: 1 | 2): Card {
  const ring = { cues: ['a', 'b', 'c', 'd'].map((text) => ({ text })), activeIndex: 0 };
  return {
    id: 'card-1',
    type,
    x: 0,
    y: 0,
    z: 0,
    tuckedUnder: null,
    rings: ringCount === 2 ? [ring, ring] : [ring],
  };
}

const halves = () => screen.getAllByRole('button');

describe('RingControl', () => {
  it('RingControl_oneRingCard_rendersTwoHalfButtons', () => {
    render(<RingControl card={card('role', 1)} onTurn={() => {}} />);
    expect(halves().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Turn Nouns Left',
      'Turn Nouns Right',
    ]);
  });

  it('RingControl_combinedCard_rendersFourHalfButtonsWithLabels', () => {
    render(<RingControl card={card('setting', 2)} onTurn={() => {}} />);
    expect(halves().map((b) => b.getAttribute('aria-label'))).toEqual([
      'Turn Nouns Left',
      'Turn Nouns Right',
      'Turn Adjectives Left',
      'Turn Adjectives Right',
    ]);
  });

  it('RingControl_rightHalfClick_callsOnTurnCw', () => {
    const onTurn = vi.fn();
    render(<RingControl card={card('goal', 1)} onTurn={onTurn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Turn Cues Right' }));
    expect(onTurn).toHaveBeenCalledWith('outer', 'cw');
  });

  it('RingControl_leftHalfClick_callsOnTurnCcw', () => {
    const onTurn = vi.fn();
    render(<RingControl card={card('modifier', 1)} onTurn={onTurn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Turn Adjectives Left' }));
    expect(onTurn).toHaveBeenCalledWith('outer', 'ccw');
  });

  it('RingControl_innerHalfOnCombined_usesInnerSlot', () => {
    const onTurn = vi.fn();
    render(<RingControl card={card('role', 2)} onTurn={onTurn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Turn Adjectives Right' }));
    expect(onTurn).toHaveBeenCalledWith('inner', 'cw');
  });
});

describe('useRingKeys', () => {
  function setup(targetId: string | null) {
    const onTurn = vi.fn();
    renderHook(() => useRingKeys(() => targetId, onTurn));
    return onTurn;
  }

  const press = (init: KeyboardEventInit, target: EventTarget = window) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  it('useRingKeys_r_turnsOuterOfTarget', () => {
    const onTurn = setup('card-1');
    expect(press({ key: 'r' }).defaultPrevented).toBe(true);
    expect(onTurn).toHaveBeenCalledWith('card-1', 'outer');
  });

  it('useRingKeys_shiftR_turnsInnerOfTarget', () => {
    const onTurn = setup('card-1');
    press({ key: 'R', shiftKey: true });
    expect(onTurn).toHaveBeenCalledWith('card-1', 'inner');
  });

  it('useRingKeys_rInsideInput_ignored', () => {
    const onTurn = setup('card-1');
    const input = document.createElement('input');
    document.body.append(input);
    press({ key: 'r' }, input);
    input.remove();
    expect(onTurn).not.toHaveBeenCalled();
  });

  it('useRingKeys_ctrlR_ignored', () => {
    const onTurn = setup('card-1');
    expect(press({ key: 'r', ctrlKey: true }).defaultPrevented).toBe(false);
    expect(onTurn).not.toHaveBeenCalled();
  });

  it('useRingKeys_noTarget_doesNotPreventDefault', () => {
    const onTurn = setup(null);
    expect(press({ key: 'r' }).defaultPrevented).toBe(false);
    expect(onTurn).not.toHaveBeenCalled();
  });
});

describe('ringGeometry', () => {
  it('halfAnnulusPath_left_staysLeftOfSplit', () => {
    const path = halfAnnulusPath(43, 56, 'left');
    // Every x in M, L and the arc end points is 124 or less (center 125, 1 px half split).
    const xs = [...path.matchAll(/[ML] ([\d.]+)|0 0 [01] ([\d.]+)/g)].map((m) =>
      Number(m[1] ?? m[2]),
    );
    expect(xs.length).toBe(4);
    for (const x of xs) expect(x).toBeLessThanOrEqual(124);
  });
});
