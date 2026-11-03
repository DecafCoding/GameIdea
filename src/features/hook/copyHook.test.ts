/**
 * Tests for Copy: a good write, a rejected write and no clipboard at all.
 */
import { describe, expect, it, vi } from 'vitest';
import { copyHook } from './copyHook';

describe('copyHook', () => {
  it('copyHook_writeResolves_copied', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    expect(await copyHook('You are a pilot.', { writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('You are a pilot.');
  });

  it('copyHook_writeRejects_blocked', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('NotAllowedError')));
    expect(await copyHook('x', { writeText })).toBe('blocked');
  });

  it('copyHook_noClipboard_blocked', async () => {
    expect(await copyHook('x', undefined)).toBe('blocked');
  });
});
