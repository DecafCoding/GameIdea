/**
 * Lock: a locked card keeps its cues when Redraw All runs (mvp-plan.html Rules). Pure and
 * immutable, like the ring math. The rings still turn on a locked card.
 */
import type { Card } from '@/shared/model';

/** Returns a new card with its lock flipped. */
export function toggleLock(card: Card): Card {
  return { ...card, locked: !card.locked };
}
