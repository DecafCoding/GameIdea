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
 * First combine: the Modifier's ring becomes the target's rings[1], keeping its
 * active cue. The caller deletes the Modifier card. A later Modifier exchanges the
 * adjectives through swap, and split takes them back out.
 */
export function combine(target: Card, modifier: Card): Card {
  if (target.type !== 'role' && target.type !== 'setting') {
    throw new Error(
      `A Modifier combines only with a Player Role or Setting, not a ${target.type}.`,
    );
  }
  if (target.rings.length !== 1) {
    throw new Error('This card already has adjectives.');
  }
  if (modifier.type !== 'modifier') {
    throw new Error(`Only a Modifier can be combined, not a ${modifier.type}.`);
  }
  const source = ringAt(modifier, 0);
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
 * Swap: the combined card's adjectives and the Modifier's ring change places, each
 * keeping its own active cue. The caller places the Modifier beside the card.
 */
export function swap(target: Card, modifier: Card): { target: Card; modifier: Card } {
  requireCombined(target);
  if (modifier.type !== 'modifier') {
    throw new Error(`Only a Modifier can be swapped, not a ${modifier.type}.`);
  }
  const adjectives = ringAt(target, 1);
  const incoming = ringAt(modifier, 0);
  return {
    target: { ...target, rings: [ringAt(target, 0), copyRing(incoming)] },
    modifier: { ...modifier, rings: [copyRing(adjectives)] },
  };
}

/**
 * Split: the combined card keeps only its nouns; the returned ring is a copy of its old
 * adjectives with their active cue, for the caller's new Modifier card.
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
  if (card.type === 'modifier' || ringIndex === 1) return 'Adjectives';
  if (card.type === 'role' || card.type === 'resource' || card.type === 'setting') {
    return 'Nouns';
  }
  // Mechanic, Mood and the 2-cue decks.
  return 'Cues';
}
