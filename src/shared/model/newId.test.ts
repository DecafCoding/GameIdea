/** Tests for newId and its fallback for plain-HTTP pages without crypto.randomUUID. */
import { describe, expect, it } from 'vitest';
import { newId, uuidFromBytes } from './newId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('newId_randomUUIDPresent_returnsV4Uuid', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('newId_randomUUIDMissing_returnsV4UuidFromRandomBytes', () => {
    // Simulate a non-secure context, where randomUUID is not defined.
    const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => newId()));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(UUID_V4);
    } finally {
      if (original) Object.defineProperty(crypto, 'randomUUID', original);
      else delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
  });

  it('uuidFromBytes_allOnes_setsVersionAndVariantBits', () => {
    expect(uuidFromBytes(new Uint8Array(16).fill(0xff))).toBe(
      'ffffffff-ffff-4fff-bfff-ffffffffffff',
    );
  });

  it('uuidFromBytes_wrongLength_throws', () => {
    expect(() => uuidFromBytes(new Uint8Array(15))).toThrow();
  });
});
