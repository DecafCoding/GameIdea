/**
 * Tests for the lock.
 */
import { describe, expect, it } from 'vitest';
import { fixtureCard } from '@/test/fixtures/boards';
import { toggleLock } from './lock';

describe('toggleLock', () => {
  it('toggleLock_unlocked_locks', () => {
    const card = fixtureCard('mechanic');
    const locked = toggleLock(card);
    expect(locked.locked).toBe(true);
    expect(card.locked).toBe(false);
    expect(locked.rings).toBe(card.rings);
  });

  it('toggleLock_twice_unlocks', () => {
    expect(toggleLock(toggleLock(fixtureCard('goal'))).locked).toBe(false);
  });
});
