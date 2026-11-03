/**
 * Ring math: turning rings, reading the cue on each edge, combine, swap and split.
 * Pure and immutable: every function returns new objects, which keeps undo correct.
 * Edge order is clockwise from the bottom: 4-cue 0 bottom, 1 left, 2 top, 3 right;
 * 2-cue 0 bottom, 1 top. The cue at activeIndex sits on the bottom edge.
 */
import type { Card, Cue, Ring } from '@/shared/model';

export type TurnDirection = 'cw' | 'ccw';
export type RingSlot = 'outer' | 'inner';

/** One edge of a card: the ring-0 word, plus the adjective on a combined card. */
export interface EdgeCue {
  edge: number;
  adjective?: Cue;
  noun: Cue;
}

/** Turns a ring one step. Clockwise brings the right-edge cue to the bottom. */
export function turnRing(ring: Ring, direction: TurnDirection): Ring {
  const n = ring.cues.length;
  const step = direction === 'cw' ? -1 : 1;
  return { ...ring, activeIndex: (ring.activeIndex + step + n) % n };
}

export function isCombined(card: Card): boolean {
  return card.rings.length === 2;
}

/** The ring a slot turns: a 1-ring card turns its only ring from either slot. */
export function ringIndexFor(card: Card, slot: RingSlot): number {
  if (!isCombined(card)) return 0;
  return slot === 'outer' ? 0 : 1;
}

/** Returns a new card with the ring in that slot turned one step. */
export function turnCard(card: Card, slot: RingSlot, direction: TurnDirection): Card {
  const index = ringIndexFor(card, slot);
  return {
    ...card,
    rings: card.rings.map((ring, i) => (i === index ? turnRing(ring, direction) : ring)),
  };
}

function ringAt(card: Card, index: number): Ring {
  const ring = card.rings[index];
  if (!ring) throw new Error(`The ${card.type} card has no ring ${index}.`);
  return ring;
}

/** The cue on each edge, clockwise from the bottom (edge 0 is the active edge). */
export function edgeCues(card: Card): EdgeCue[] {
  const nouns = ringAt(card, 0);
  const adjectives = isCombined(card) ? ringAt(card, 1) : null;
  const n = nouns.cues.length;
  return nouns.cues.map((_, k) => {
    const noun = nouns.cues[(nouns.activeIndex + k) % n]!;
    if (!adjectives) return { edge: k, noun };
    const m = adjectives.cues.length;
    return { edge: k, noun, adjective: adjectives.cues[(adjectives.activeIndex + k) % m]! };
  });
}

/** The bottom edge as one string: "exiled navigator" or "navigator". */
export function activeText(card: Card): string {
  const [bottom] = edgeCues(card);
  if (!bottom) return '';
  return bottom.adjective ? `${bottom.adjective.text} ${bottom.noun.text}` : bottom.noun.text;
}

/**
 * First combine: the Description's ring becomes the target's rings[1], keeping its
 * active cue. The caller deletes the Description card. A later Description exchanges the
 * adjectives through swap, and split takes them back out.
 */
export function combine(target: Card, description: Card): Card {
  if (target.type !== 'character' && target.type !== 'setting') {
    throw new Error(
      `A Description combines only with a Character or Setting, not a ${target.type}.`,
    );
  }
  if (target.rings.length !== 1) {
    throw new Error('This card already has adjectives.');
  }
  if (description.type !== 'description') {
    throw new Error(`Only a Description can be combined, not a ${description.type}.`);
  }
  const source = ringAt(description, 0);
  return {
    ...target,
    rings: [ringAt(target, 0), { cues: [...source.cues], activeIndex: source.activeIndex }],
  };
}

function copyRing(ring: Ring): Ring {
  return { cues: [...ring.cues], activeIndex: ring.activeIndex };
}

function requireCombined(card: Card): void {
  if (!isCombined(card)) throw new Error('This card has no adjectives.');
}

/**
 * Swap: the combined card's adjectives and the Description's ring change places, each
 * keeping its own active cue. The caller places the Description beside the card.
 */
export function swap(target: Card, description: Card): { target: Card; description: Card } {
  requireCombined(target);
  if (description.type !== 'description') {
    throw new Error(`Only a Description can be swapped, not a ${description.type}.`);
  }
  const adjectives = ringAt(target, 1);
  const incoming = ringAt(description, 0);
  return {
    target: { ...target, rings: [ringAt(target, 0), copyRing(incoming)] },
    description: { ...description, rings: [copyRing(adjectives)] },
  };
}

/**
 * Split: the combined card keeps only its nouns; the returned ring is a copy of its old
 * adjectives with their active cue, for the caller's new Description card.
 */
export function split(target: Card): { target: Card; ring: Ring } {
  requireCombined(target);
  return {
    target: { ...target, rings: [ringAt(target, 0)] },
    ring: copyRing(ringAt(target, 1)),
  };
}

/** The word for a ring's cues, used in ring-half labels such as "Turn Nouns Left". */
export function ringWord(card: Card, ringIndex: number): 'Nouns' | 'Adjectives' | 'Cues' {
  if (card.type === 'motivation' || card.type === 'conflict') return 'Cues';
  if (card.type === 'description' || ringIndex === 1) return 'Adjectives';
  return 'Nouns';
}
